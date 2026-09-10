-- 상용화 일정 — 항목은 코드에 두고, 「어디까지 했나」만 여기 남긴다.
--
-- 항목 자체를 표에 넣으면 일정을 고칠 때마다 운영 DB를 건드려야 하고 무엇이
-- 언제 바뀌었는지가 git 에 안 남는다. 상태만 쌓는다.

CREATE TABLE IF NOT EXISTS launch_tasks (
  id       text PRIMARY KEY,          -- lib/launchPlan.ts 의 항목 id
  status   text NOT NULL DEFAULT 'todo',  -- todo | doing | done | blocked
  note     text,
  done_at  timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
