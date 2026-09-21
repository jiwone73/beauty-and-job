-- 확정된 면접 약속을 취소할 수 있게 한다.
-- appointment_status 는 PROPOSED(제안)·ACCEPTED(수락)·DECLINED(거절) 셋만
-- 허용했는데, 확정(ACCEPTED)된 뒤에 취소하는 길이 없었다. CANCELED 를 더한다.
ALTER TABLE proposal_messages DROP CONSTRAINT proposal_messages_appointment_status_check;
ALTER TABLE proposal_messages ADD CONSTRAINT proposal_messages_appointment_status_check
  CHECK (appointment_status = ANY (ARRAY['PROPOSED','ACCEPTED','DECLINED','CANCELED']));
