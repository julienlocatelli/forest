# Code map

Map what an idea would touch in Forest before it is specified, so `/specification` asks the right questions and splits the work well. Describe the code as it is; designing the change belongs to `/plan`.

The report covers:

1. **The idea, restated.** What it would let a user do, in one or two lines, from the ticket or the question.
2. **What exists.** The modules, files, endpoints, pages, data models, scripts and skills the idea touches, each with `path:line` evidence, and what each does today for this idea.
3. **Tests.** The unit tests, e2e features and checks that cover that code today, or that none do.
4. **Gaps and constraints.** What is missing for the idea, and the rules the code already enforces that the idea must respect: guards, validations, migrations, CI checks.
5. **Questions for `/specification`.** The decisions the code leaves open for the user: scope, business rules, error cases. Put them in the report's options when they are choices, and in its open questions otherwise.

Options and recommendation may be "none" when the map leaves no choice: the map itself is the answer.

Done when every part of the code the idea touches is named with evidence, and each one's tests are named or stated missing.
