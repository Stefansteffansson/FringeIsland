Read docs/planning/sessions/openers/STATUS.md. Find the first row
marked Next. Author the opener instance for that entity per the
template at docs/templates/autonomous-l1-l3-session-opener.md:
read the template's §0 substitution markers, resolve each one
against the current program state by reading the relevant bridges,
the predecessor's pickup block, the entity's L2 inventory line,
and git log for the current tip SHA.

Surface the filled-in instance for review BEFORE writing to disk.
After ratification, write to
docs/planning/sessions/openers/{entity-slug}-descent-opener.md
(entity-descriptive convention; named by the PRE-rename name when
the descent is rename-bearing), delete §0 from the instance, commit
as a small chore(planning) commit with one file.

Then update STATUS.md: mark the entity In flight, fill in the
Opener instance column. Commit STATUS.md as a separate small
commit.

Two commits total. No push.