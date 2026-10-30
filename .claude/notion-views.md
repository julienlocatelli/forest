# Notion views

Skills find backlog tickets and Go Forest stories through these unfiltered views in `view` mode. View mode costs no `rows`/SQL query allowance, which the workspace can run out of.

| View | URL | Rows |
| --- | --- | --- |
| Backlog "Board view" | `view://3f574e46-26fd-8024-971a-000cba530a11` | Every backlog ticket; its `BLF-<n>` number is the unnamed `""` column |
| Go Forest "Board View" | `view://648bc0dc-97ab-4e54-a61a-a2faa0e16118` | Every story, with `TASK`, `Name`, `Status` and `Branch` |

## Find rows

1. Query the view with `query_data_sources` in `view` mode and `page_size` 100.
2. While the answer has `has_more: true`, query again with its `next_cursor` as `start_cursor`.
3. Keep the rows that match across all pages. Titles may come back with escaped brackets: `[BLF-3]` reads `\[BLF-3\]`.

A fetch that shows a different view or column name means the board changed: stop and tell the user instead of guessing.
