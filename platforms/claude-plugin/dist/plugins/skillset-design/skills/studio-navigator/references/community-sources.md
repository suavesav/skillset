
# Community Sources

The places Gladewick players gather, and how much weight each carries when reading sentiment. Official-hub data comes through the greenroom MCP server; the rest is read manually or via exports.

## The sources

**Greenroom** — the official community hub, run by the studio. Announcement threads, feedback boards per title, and the bug-report intake. Highest signal per post because posts attach to a game account (playtime and platform are visible to staff). Bias: skews invested veterans; new players rarely find it.

**Mothlight** — the largest fan forum, independent, named for Emberwake's seasons. Theorycrafting, build guides, economy arguments. The best early-warning source for balance sentiment: Mothlight notices a nerf's second-order effects days before anywhere else. Bias: hardcore Emberwake; Drift Harbor discussion is a single quiet subforum.

**Emberpedia** — the community wiki. Not a discussion venue, but its edit activity is a signal: a spike of edits on one item or encounter page means players are confused or something changed that shouldn't have. Watch the "disputed mechanics" category.

**Clipwake** — the video-clip community where players post short gameplay clips. The main venue for *showing* bugs and desyncs, and the only place Drift Harbor's decorating community is loud. Bias: spectacular beats representative; a clip's spread measures shareability, not frequency.

## Weighting rules

- Weight by **volume × representativeness**, and treat reach as a separate axis. A Clipwake clip with 200k views is one occurrence with high reach — it predicts *perception* pressure, not incidence.
- Greenroom reports with attached accounts outweigh anonymous forum posts roughly 3:1 for factual claims (does the bug exist, which platform). For sentiment, no source outweighs another — sentiment is real wherever it's felt.
- Cross-source confirmation is the strongest signal: the same complaint appearing on Greenroom, Mothlight, and Clipwake within 48h is a real event regardless of any single source's volume.
- Nothing from these sources overrides telemetry on questions telemetry can answer (how many, how often — see [[telemetry-schema]]). Community tells you *why it feels bad*; the warehouse tells you *how much*.

## Loud vs large

A loud minority and a large majority look identical in thread volume. Separators:

- Count **unique voices, not posts**. Mothlight balance threads routinely show 60% of posts from under 10 accounts.
- Check whether complaint volume moves with the affected population. A complaint about vault loot should scale with vault runners; if it doesn't, it's a community argument, not a player experience.
- Silence is data: a change that telemetry shows affecting 40% of players but generating no threads is being tolerated, not unnoticed. Note it either way.

## Brigade and bot patterns to discount

- **Vote-train:** dozens of near-identical short posts within an hour, accounts with no prior history in that subforum. Common after balance nerfs; count as one voice.
- **Refund-chorus:** coordinated "uninstalling / refunding" replies pasted across every announcement regardless of topic. The tell is topic-independence.
- **Wiki-griefing:** Emberpedia edit spikes from new accounts changing numbers without patch citations — noise, and separately a report to the wiki stewards.
- Discounting is silent. Never publicly label a thread a brigade in studio channels that leak; per [[studio-brand]], the studio does not accuse its players.
