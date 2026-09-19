The last thing I built with an AI coding tool is KilnFlow (github.com/sangvirgo/kilnflow, live at task.tansang.dpdns.org): a system for a ceramics workshop. A staff member types an order in free Vietnamese, and one orchestrator plus five agents (parser, estimator, risk/QC, scheduler, knowledge chatbot) turn it into a batch that moves through seven production stages, with alerts and buttons in Telegram. I built it with Claude Code and Codex on NestJS, Next.js and MySQL.

The AI got the happy path running quickly. What I had to fix myself:

- **The risk agent invented problems.** It let the LLM decide what counted as a risk. I moved the thresholds and rules into code, and let the model only word the message.
- **The parser dropped Vietnamese diacritics** in some outputs and hid provider errors. I forced diacritic output and made failures visible instead of swallowed.
- **The first live trace events were lost.** The pipeline started before the client had subscribed to the stream. I deferred the start until it connected.
- **Embeddings failed when the API was unavailable.** I added a local fallback so estimation still returns an answer.
- **Numbers that disagreed.** The firing-hours estimate differed between two places, which I found by reading the output.

The rule I kept: a model's output is only a proposal. It is validated, and a person confirms it before it becomes production data.
