# Licence decision (owner to choose)

No licence has been applied to this repository yet. Per `implementation.md` Section 14, the
default is to leave the choice to the owner until the dependency/licence review is complete.

Options:

| Option | When to pick it | Notes |
|---|---|---|
| **MIT** | You want the widest reuse with minimal obligations. | Permissive; requires preserving the copyright notice and licence text. Compatible with all dependencies currently planned. |
| **Apache-2.0** | You want a permissive licence with an explicit patent grant. | Slightly longer; includes NOTICE handling. Compatible with the planned dependency set. |
| **Proprietary / All rights reserved** | You intend to distribute closed-source, possibly commercially. | Must still honour OFL font licences and the licences of bundled dependencies (all permissive). |

## Dependency licence posture

All shipped dependencies are intended to be permissive (MIT/BSD/ISC/Apache-2.0) and all bundled
fonts OFL-1.1. `PyMuPDF` (AGPL) is intentionally **not** used. See `docs/DEPENDENCIES.md` for the
running audit. **Action required:** review `docs/DEPENDENCIES.md` and choose a licence here before
the first public release.
