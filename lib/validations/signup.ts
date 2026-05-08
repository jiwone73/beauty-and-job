import { z } from "zod";

/**
 * 휴대전화 번호 검증
 * 010-1234-5678 또는 01012345678 형식 모두 허용
 */
export const phoneSchema = z
  .string()
  .min(1, "휴대전화 번호를 입력해주세요")
  .regex(/^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/, "올바른 휴대전화 번호를 입력해주세요");

/**
 * 인증번호 검증 (6자리 숫자)
 */
export const verificationCodeSchema = z
  .string()
  .length(6, "인증번호는 6자리입니다")
  .regex(/^[0-9]{6}$/, "숫자만 입력해주세요");

/**
 * 기본 정보 검증
 */
export const basicInfoSchema = z.object({
  name: z
    .string()
    .min(1, "반드시 실명을 입력해 주세요.")
    .max(20, "이름은 20자 이내로 입력해주세요"),
  birth: z
    .string()
    .length(8, "생년월일 8자리를 입력해주세요")
    .regex(/^[0-9]{8}$/, "숫자 8자리로 입력해주세요"),
  gender: z.enum(["남성", "여성"], {
    errorMap: () => ({ message: "성별을 선택해주세요" }),
  }),
});

/**
 * 약관 동의 검증 (필수 3개 모두 체크)
 */
export const termsSchema = z.object({
  age: z.literal(true, {
    errorMap: () => ({ message: "필수 약관에 동의해주세요" }),
  }),
  tos: z.literal(true, {
    errorMap: () => ({ message: "필수 약관에 동의해주세요" }),
  }),
  privacy: z.literal(true, {
    errorMap: () => ({ message: "필수 약관에 동의해주세요" }),
  }),
  marketing: z.boolean(),
});

/**
 * 휴대전화 번호 자동 포맷팅
 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/**
 * 휴대전화 번호 유효성
 */
export function isValidPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11;
}

/**
 * 생년월일 유효성 (YYYYMMDD)
 */
export function isValidBirth(value: string): boolean {
  if (!/^[0-9]{8}$/.test(value)) return false;
  const year = parseInt(value.slice(0, 4));
  const month = parseInt(value.slice(4, 6));
  const day = parseInt(value.slice(6, 8));
  if (year < 1900 || year > new Date().getFullYear()) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  return true;
}
