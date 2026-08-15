-- 샘플 데이터 정합성 보정 (실 사용자 데이터는 건드리지 않는다)
--
-- 샘플 지원서는 상태값만 무작위로 넣고 viewed_at 을 채우지 않아,
-- '합격 27건이 전부 미열람' 처럼 앞뒤가 맞지 않는 화면이 나왔다.
-- 이력서를 열어야 갈 수 있는 단계(검토중·면접·합격·불합격)인데 열람 시각이 없는 건만
-- 지원일 이후~상태 변경 시점 사이로 채운다. 순서가 뒤집히지 않게 둘 중 이른 쪽을 쓴다.
--
-- 실제 계정(is_sample = false)은 API가 이미 정확히 기록하므로 대상에서 뺀다.
UPDATE applications a
SET viewed_at = LEAST(
      COALESCE(a.status_updated_at, a.applied_at + INTERVAL '1 day'),
      a.applied_at + INTERVAL '1 day' * (1 + random() * 2)
    )
FROM job_postings jp
JOIN companies c ON c.id = jp.company_id
WHERE jp.id = a.job_posting_id
  AND c.is_sample = true
  AND a.viewed_at IS NULL
  AND a.status IN ('VIEWED', 'INTERVIEW', 'PASSED', 'REJECTED');

-- 시드가 열람 시각을 지원일보다 앞서 넣은 건도 바로잡는다(샘플만).
-- 실계정에도 같은 역전이 2건 있으나(beautyLab·뷰티살롱, 초기 테스트 기록으로 보임)
-- 사용자가 실제로 만든 데이터라 임의로 고치지 않고 남겨 둔다.
UPDATE applications a
SET viewed_at = a.applied_at + INTERVAL '1 day' * (1 + random() * 2)
FROM job_postings jp
JOIN companies c ON c.id = jp.company_id
WHERE jp.id = a.job_posting_id
  AND c.is_sample = true
  AND a.viewed_at IS NOT NULL
  AND a.viewed_at < a.applied_at;
