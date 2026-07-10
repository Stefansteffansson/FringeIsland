# Cold-start research — how the field solves what we measured (2026-07-10)

**Commissioned by:** Stefan, 2026-07-10, after the §7 per-instance findings and the failed pinger validation ([`../planning/hub-v2/2026-07-09-cold-load-regression-analysis.md`](../planning/hub-v2/2026-07-09-cold-load-regression-analysis.md) §7).
**Question:** is our per-instance provisioning wave a known phenomenon, and how have other developers solved it?
**Method:** web search + primary-source verification against Vercel's own documentation (fetched and indexed 2026-07-10).

---

## 1. Our findings are a known, named problem

- **"A ping keeps exactly one container warm."** The serverless community documented our exact experiment result years ago (AWS Lambda era): warming pings hold a single instance; **concurrent requests each get their own cold start**, and a ping "would only reach one of the concurrent executions" (Yan Cui, ["I'm afraid you're thinking about AWS Lambda cold starts all wrong"](https://theburningmonk.com/2018/01/im-afraid-youre-thinking-about-aws-lambda-cold-starts-all-wrong/); [Dashbird](https://dashbird.io/blog/can-we-solve-serverless-cold-starts/)). Tools like [lambda-warmer](https://github.com/jeremydaly/lambda-warmer) exist specifically to fake N *concurrent delayed* invocations — and even those are considered a workaround, superseded on AWS by provisioned concurrency. Our tick-2/page-boot failure is this literature's prediction, confirmed on Vercel.
- **Scale-to-zero after "a few minutes" is by design.** Vercel: "Traditional serverless platforms shut down inactive instances after a few minutes to save costs" ([Scale to one](https://vercel.com/blog/scale-to-one-how-fluid-solves-cold-starts)). Our measured <4.5-minute instance decay on Hobby is normal platform behaviour, not a fault.

## 2. Vercel's official solution stack (primary sources)

1. **Fluid compute — optimized (in-function) concurrency:** "multiple invocations share a single function instance … available when using **Node.js or Python** runtimes" ([Fluid docs](https://vercel.com/docs/fluid-compute)). This is precisely the mechanism whose absence we measured: our 4-way Edge fan-out drew 4 instances/4 boots; on Node+Fluid a concurrent fan-out shares one instance — **a burst pays at most one boot**. Fluid is default-on since April 2025 (all plans, including Hobby) and is already enabled for this project.
2. **The Edge runtime is deprecated — and the vendor now recommends Node *for performance*:** "Edge Functions are deprecated. Use Vercel Functions with the Node.js runtime instead" ([Edge Functions (deprecated)](https://vercel.com/docs/functions/runtimes/edge/edge-functions.rsc)); "We recommend migrating from edge to Node.js **for improved performance and reliability**" ([Edge Runtime docs](https://vercel.com/docs/functions/runtimes/edge)). Migration = remove `export const runtime = 'edge'` (Node is the default); region co-location survives via the project's function region (already `dub1` — the per-route `preferredRegion` pin was an Edge-only need, since Edge defaults to nearest-PoP).
3. **Scale to one — Pro/Enterprise only:** "production deployments on Pro and Enterprise plans keep at least one function instance running" ([Scale to one](https://vercel.com/blog/scale-to-one-how-fluid-solves-cold-starts)). Combined with in-function concurrency this is the *complete* fix: an always-warm instance serves the whole fan-out — the vendor-side version of what our external pinger structurally could not do. Vercel's aggregate claim: "zero cold starts for 99.37% of all requests." Hobby scales to zero; no configuration changes that.
4. **Bytecode caching + pre-warming** (automatic, production deployments, all plans) make the unavoidable boots faster ([how the stack composes](https://vercel.com/blog/scale-to-one-how-fluid-solves-cold-starts)); bundle-size reduction/dynamic imports shrink init cost ([Vercel KB](https://vercel.com/kb/guide/how-can-i-improve-serverless-function-lambda-cold-start-performance-on-vercel)) — secondary for us, since our in-function times are already ~ms and the cost is pre-function.

## 3. What the rest of the field does

- **Cron/uptime-service warming pings** — the most-recommended folk remedy ([example](https://www.sabbaticaldev.co.uk/post/keep-your-serverless-functions-warm)); fails under concurrency per §1, exactly as our experiment showed. Retired for us.
- **Leave scale-to-zero hosting** (always-on server: Railway/Fly/VPS; or Cloudflare Workers' isolate model). Real but heavy — contradicts our ADR-U036 posture and adds ops surface; not warranted while vendor-supported fixes remain untried.
- **Reduce first-paint fan-out** (bundle reads, cache app-boot state) — platform-agnostic and always compounding; this is our L3 lever, independent of any runtime call.

## 4. Implications for FringeIsland (feeds the ADR-U036 next touch)

Ranked by cost-effectiveness against the measured mechanism:

1. **Migrate the hot-read routes edge→Node (free, vendor-recommended).** Turns the fan-out multiplier (3–4 concurrent boots) into ≤1 via in-function concurrency, and exits a deprecated runtime. Note the inversion: ADR-U036 chose Edge on the "~0 ms isolate cold start" premise; our §6/§7 measurements showed Edge pays the same provisioning wave, and the vendor now recommends Node *for performance*. The addendum's "no perf-forced migration" premise is superseded — the deprecation clock and the perf motive now point the same way.
2. **Fan-out reduction (L3, un-parked)** — fewer concurrent first-paint reads; valuable on any runtime; compounds with #1.
3. **Vercel Pro (≈$20/mo) if the residual single boot still hurts after #1+#2** — scale-to-one eliminates the first-visitor boot entirely; this is the purchasable version of "keep-warm done right." Decision is Stefan's (recurring cost).
4. **Not recommended now:** platform move / Cloudflare rewrite — disproportionate while #1–#3 are untried.

**Caveat recorded:** Node on Hobby still scales to zero — after #1, a deep-idle first request still pays one boot (our §6 measured probe-node deep-cold at 2 519 ms; Fluid's bytecode caching/pre-warming softens but does not eliminate it). #1 fixes the *multiplier*, #3 fixes the *base case*.

## Sources

- [Vercel — Fluid compute docs](https://vercel.com/docs/fluid-compute) · [Scale to one: How Fluid solves cold starts](https://vercel.com/blog/scale-to-one-how-fluid-solves-cold-starts) · [Edge Runtime docs](https://vercel.com/docs/functions/runtimes/edge) · [Edge Functions (deprecated)](https://vercel.com/docs/functions/runtimes/edge/edge-functions.rsc) · [How Fluid compute works](https://vercel.com/blog/how-fluid-compute-works-on-vercel) · [Vercel KB — improving cold start performance](https://vercel.com/kb/guide/how-can-i-improve-serverless-function-lambda-cold-start-performance-on-vercel)
- [Yan Cui — cold starts all wrong](https://theburningmonk.com/2018/01/im-afraid-youre-thinking-about-aws-lambda-cold-starts-all-wrong/) · [Dashbird — can we solve serverless cold starts](https://dashbird.io/blog/can-we-solve-serverless-cold-starts/) · [lambda-warmer](https://github.com/jeremydaly/lambda-warmer) · [InfoQ on Vercel Fluid](https://www.infoq.com/news/2025/03/vercel-fluid/)
