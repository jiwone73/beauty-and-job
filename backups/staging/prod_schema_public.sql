--
-- PostgreSQL database dump
--

\restrict CIIfJlgSdMZy5mQhMj4iCDkJ3DDjy1mHkdhqbR59hOMlVNznqzRh7svMAOrEjIt

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: actor_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.actor_type AS ENUM (
    'user',
    'company',
    'admin'
);


--
-- Name: admin_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.admin_role AS ENUM (
    'SUPER_ADMIN',
    'ADMIN'
);


--
-- Name: app_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_status AS ENUM (
    'APPLIED',
    'VIEWED',
    'INTERVIEW',
    'PASSED',
    'REJECTED',
    'WITHDRAWN'
);


--
-- Name: career_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.career_type AS ENUM (
    'NEW',
    'EXPERIENCED'
);


--
-- Name: category_scope; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.category_scope AS ENUM (
    'OFFICE',
    'STORE',
    'BOTH'
);


--
-- Name: company_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.company_status AS ENUM (
    'PENDING',
    'ACTIVE',
    'SUSPENDED',
    'REJECTED',
    'WITHDRAWN'
);


--
-- Name: company_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.company_type AS ENUM (
    'BRAND',
    'STORE',
    'BOTH',
    'OFFICE'
);


--
-- Name: company_type_new; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.company_type_new AS ENUM (
    'OFFICE',
    'STORE',
    'BOTH'
);


--
-- Name: degree_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.degree_type AS ENUM (
    'HIGH_SCHOOL',
    'ASSOCIATE',
    'BACHELOR',
    'MASTER',
    'DOCTOR',
    'ETC'
);


--
-- Name: desired_work_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.desired_work_type AS ENUM (
    'FULL_TIME',
    'PART_TIME',
    'CONTRACT'
);


--
-- Name: experience_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.experience_level AS ENUM (
    'NEW',
    'EXPERIENCED',
    'ANY'
);


--
-- Name: file_purpose; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.file_purpose AS ENUM (
    'PROFILE_IMAGE',
    'COMPANY_LOGO',
    'RESUME_ATTACHMENT',
    'JOB_IMAGE'
);


--
-- Name: grad_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.grad_status AS ENUM (
    'GRADUATED',
    'ENROLLED',
    'DROPPED',
    'EXPECTED'
);


--
-- Name: job_search_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.job_search_status AS ENUM (
    'SEEKING',
    'OPEN',
    'CLOSED'
);


--
-- Name: job_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.job_status AS ENUM (
    'DRAFT',
    'ACTIVE',
    'CLOSED',
    'HIDDEN',
    'EXPIRED'
);


--
-- Name: job_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.job_type AS ENUM (
    'OFFICE',
    'STORE'
);


--
-- Name: notif_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notif_type AS ENUM (
    'APP_VIEWED',
    'INTERVIEW_REQ',
    'PASSED',
    'REJECTED_APP',
    'NEW_APPLICANT',
    'JOB_DEADLINE',
    'CO_APPROVED',
    'CO_REJECTED',
    'PROPOSAL',
    'PROPOSAL_INTEREST',
    'APPT_SOON',
    'TALENT_MATCH_ASK',
    'TALENT_INTEREST'
);


--
-- Name: payment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status AS ENUM (
    'PENDING',
    'PAID',
    'REFUNDED',
    'CANCELLED'
);


--
-- Name: resume_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.resume_status AS ENUM (
    'DRAFT',
    'PUBLISHED'
);


--
-- Name: salary_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.salary_type AS ENUM (
    'ANNUAL',
    'MONTHLY',
    'HOURLY',
    'NEGOTIABLE',
    'WEEKLY'
);


--
-- Name: skill_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.skill_type AS ENUM (
    'SKILL',
    'LICENSE',
    'LANGUAGE'
);


--
-- Name: storage_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.storage_type AS ENUM (
    'LOCAL',
    'S3',
    'R2'
);


--
-- Name: term_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.term_type AS ENUM (
    'SERVICE',
    'PRIVACY',
    'MARKETING',
    'LOCATION',
    'RECOMMENDATION',
    'TALENT_RECOMMEND'
);


--
-- Name: user_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.user_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'SUSPENDED',
    'WITHDRAWN'
);


--
-- Name: visibility_plan; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.visibility_plan AS ENUM (
    'BASIC',
    'PREMIUM'
);


--
-- Name: work_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.work_type AS ENUM (
    'FULL_TIME',
    'PART_TIME',
    'CONTRACT',
    'INTERN'
);


--
-- Name: fn_set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fn_set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;


--
-- Name: set_target_companies_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_target_companies_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_type text NOT NULL,
    actor_id uuid NOT NULL,
    kind text NOT NULL,
    ref_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    day date DEFAULT ((now() AT TIME ZONE 'Asia/Seoul'::text))::date NOT NULL,
    CONSTRAINT activity_events_actor_type_check CHECK ((actor_type = ANY (ARRAY['company'::text, 'user'::text])))
);


--
-- Name: ad_inquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ad_inquiries (
    id bigint NOT NULL,
    company_name text,
    contact_name text NOT NULL,
    phone text,
    email text,
    product text,
    message text NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    type text DEFAULT '광고'::text,
    is_read boolean DEFAULT false NOT NULL,
    privacy_agreed boolean DEFAULT false,
    agreed_at timestamp with time zone,
    replied_at timestamp with time zone,
    subject text,
    opened_at timestamp with time zone,
    reply_body text
);


--
-- Name: ad_inquiries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ad_inquiries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ad_inquiries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ad_inquiries_id_seq OWNED BY public.ad_inquiries.id;


--
-- Name: admin_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    login_id character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    name character varying(50) NOT NULL,
    role public.admin_role DEFAULT 'ADMIN'::public.admin_role NOT NULL,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_work_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_work_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id text NOT NULL,
    started_at timestamp with time zone NOT NULL,
    ended_at timestamp with time zone,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admin_work_sessions_range CHECK (((ended_at IS NULL) OR (ended_at >= started_at)))
);


--
-- Name: ai_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_usage (
    user_id uuid NOT NULL,
    day date NOT NULL,
    kind text NOT NULL,
    count integer DEFAULT 0 NOT NULL
);


--
-- Name: app_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_notes (
    key text NOT NULL,
    value text DEFAULT ''::text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: app_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_settings (
    key text NOT NULL,
    value text NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: application_drafts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.application_drafts (
    user_id uuid NOT NULL,
    job_posting_id uuid NOT NULL,
    resume jsonb NOT NULL,
    cover_letter text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.applications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_posting_id uuid NOT NULL,
    user_id uuid NOT NULL,
    resume_id uuid,
    cover_letter text,
    status public.app_status DEFAULT 'APPLIED'::public.app_status NOT NULL,
    applied_at timestamp with time zone DEFAULT now() NOT NULL,
    viewed_at timestamp with time zone,
    status_updated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    note text,
    resume_snapshot jsonb,
    resume_file_url text,
    resume_file_name text,
    resume_file_size integer,
    hidden_by_company boolean DEFAULT false,
    hidden_by_user boolean DEFAULT false NOT NULL,
    job_snapshot jsonb,
    delivery_status text,
    forwarded_at timestamp with time zone,
    forwarded_channel text,
    third_party_consent boolean DEFAULT false NOT NULL,
    admin_note text,
    expires_at timestamp with time zone,
    notified_at timestamp with time zone,
    linked_at timestamp with time zone,
    position_title text,
    work_location text
);


--
-- Name: benefit_tags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.benefit_tags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    job_type text DEFAULT 'BOTH'::text NOT NULL,
    is_curated boolean DEFAULT false NOT NULL,
    usage_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by_company_id uuid
);


--
-- Name: bookmarks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookmarks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    job_posting_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: community_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    anon_label text,
    body text NOT NULL,
    status text DEFAULT 'visible'::text NOT NULL,
    report_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: community_likes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_likes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: community_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category text DEFAULT '공감'::text NOT NULL,
    title text,
    body text NOT NULL,
    source text DEFAULT 'admin'::text NOT NULL,
    status text DEFAULT 'published'::text NOT NULL,
    like_count integer DEFAULT 0 NOT NULL,
    comment_count integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    published_at timestamp with time zone DEFAULT now(),
    view_count integer DEFAULT 0 NOT NULL
);


--
-- Name: community_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.community_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    target_type text NOT NULL,
    target_id uuid NOT NULL,
    reporter_id uuid NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_name character varying(100) NOT NULL,
    brand_name character varying(100),
    business_number character varying(20),
    company_type public.company_type_new NOT NULL,
    email public.citext,
    phone character varying(20),
    password_hash character varying(255),
    logo_url text,
    description text,
    website_url text,
    address text,
    status public.company_status DEFAULT 'PENDING'::public.company_status NOT NULL,
    rejected_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_sample boolean DEFAULT false,
    company_size text,
    founded_year text,
    region_sido text,
    region_sigungu text,
    representative_name text,
    business_license_path text,
    is_member boolean DEFAULT true NOT NULL,
    cover_images jsonb DEFAULT '[]'::jsonb,
    latitude double precision,
    longitude double precision,
    withdrawn_at timestamp without time zone,
    address_detail text,
    manager_name text,
    company_phone text,
    industry text,
    merged_into_company_id uuid,
    onboarding_status text DEFAULT 'RECEIVED'::text NOT NULL,
    invited_at timestamp with time zone,
    invite_channel text,
    invite_count integer DEFAULT 0 NOT NULL,
    agreed_at timestamp with time zone,
    joined_at timestamp with time zone,
    linked_at timestamp with time zone,
    links jsonb DEFAULT '[]'::jsonb NOT NULL,
    signboard_url text,
    notification_settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    paid_until date,
    last_login_at timestamp with time zone,
    plan text,
    free_posts_used integer DEFAULT 0 NOT NULL,
    trial_until date,
    kept jsonb DEFAULT '{}'::jsonb NOT NULL,
    signup_channel text,
    signup_campaign text,
    is_test_account boolean DEFAULT false NOT NULL,
    plan_source text
);


--
-- Name: COLUMN companies.free_posts_used; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.companies.free_posts_used IS '여태 올린 공고 수(기록용). 2026-09-15 부터 한도로 쓰지 않는다.';


--
-- Name: COLUMN companies.trial_until; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.companies.trial_until IS '무료 체험이 끝나는 날(이 날까지). 첫 공고를 거는 순간 오늘+7 로 정해진다. NULL 이면 아직 시작 전.';


--
-- Name: COLUMN companies.kept; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.companies.kept IS '상품별 보관 기간 {PLAN:{days,until}}. until 이 지난 칸은 없는 것으로 본다';


--
-- Name: COLUMN companies.signup_channel; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.companies.signup_channel IS '가입 당시 유입 채널. 이전 가입자는 비어 있다';


--
-- Name: COLUMN companies.is_test_account; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.companies.is_test_account IS '런칭 전 알바 테스트용 계정(실제 회사명을 빌린 내부 테스트 로그인) — 10/12 전 전량 삭제 대상';


--
-- Name: company_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    plan text NOT NULL,
    days integer NOT NULL,
    amount integer NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    depositor text,
    applied_from date,
    applied_until date,
    confirmed_at timestamp with time zone,
    canceled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    kept_days integer DEFAULT 0 NOT NULL,
    refund_waiver_agreed_at timestamp with time zone
);


--
-- Name: COLUMN company_orders.kept_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.company_orders.kept_days IS '이 주문에 얹힌 보관 일수(환산 후)';


--
-- Name: company_talent_scraps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_talent_scraps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    job_posting_id uuid
);


--
-- Name: email_failures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_failures (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    to_addr text NOT NULL,
    subject text,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: external_companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    logo_url text,
    homepage_url text,
    contact_email text,
    source_site text,
    source_url text,
    claimed_company_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: external_job_inbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_job_inbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source text NOT NULL,
    source_key text NOT NULL,
    url text NOT NULL,
    title text NOT NULL,
    company_name text,
    region text,
    salary text,
    contact_phone text,
    contact_email text,
    categories text[] DEFAULT '{}'::text[],
    parsed jsonb,
    first_seen timestamp with time zone DEFAULT now() NOT NULL,
    last_seen timestamp with time zone DEFAULT now() NOT NULL,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    uploader_id uuid NOT NULL,
    uploader_type public.actor_type NOT NULL,
    original_name character varying(255),
    storage_path text NOT NULL,
    storage_type public.storage_type DEFAULT 'LOCAL'::public.storage_type NOT NULL,
    public_url text,
    mime_type character varying(100),
    size_bytes integer,
    purpose public.file_purpose,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: inquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inquiries (
    id bigint NOT NULL,
    name text NOT NULL,
    email text,
    type text DEFAULT '기타'::text NOT NULL,
    subject text,
    message text NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    phone text,
    privacy_agreed boolean DEFAULT false NOT NULL,
    agreed_at timestamp with time zone,
    replied_at timestamp with time zone,
    opened_at timestamp with time zone,
    reply_body text
);


--
-- Name: inquiries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.inquiries ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.inquiries_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: inquiry_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inquiry_files (
    id bigint NOT NULL,
    kind text NOT NULL,
    inquiry_id text NOT NULL,
    path text NOT NULL,
    file_name text NOT NULL,
    file_size integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT inquiry_files_kind_check CHECK ((kind = ANY (ARRAY['support'::text, 'ad'::text, 'report'::text, 'support_reply'::text, 'ad_reply'::text])))
);


--
-- Name: inquiry_files_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inquiry_files_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inquiry_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inquiry_files_id_seq OWNED BY public.inquiry_files.id;


--
-- Name: insights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.insights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying NOT NULL,
    category character varying,
    content text,
    tags jsonb DEFAULT '[]'::jsonb,
    read_time integer,
    status character varying DEFAULT 'DRAFT'::character varying,
    view_count integer DEFAULT 0,
    is_sample boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: job_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(50) NOT NULL,
    parent_id uuid,
    scope public.category_scope DEFAULT 'BOTH'::public.category_scope NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: job_image_hashes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_image_hashes (
    posting_url text NOT NULL,
    image_url text NOT NULL,
    source text DEFAULT ''::text NOT NULL,
    hash text NOT NULL,
    host_origin text DEFAULT ''::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    site_protected boolean DEFAULT false NOT NULL
);


--
-- Name: job_postings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_postings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid,
    title character varying(200) NOT NULL,
    job_type public.job_type NOT NULL,
    job_category_id uuid,
    description text,
    requirements text,
    preferred_qualifications text,
    salary_min integer,
    salary_max integer,
    salary_type public.salary_type,
    location character varying(200),
    address text,
    work_type public.work_type,
    experience_level public.experience_level DEFAULT 'ANY'::public.experience_level NOT NULL,
    deadline date,
    is_featured boolean DEFAULT false NOT NULL,
    featured_until timestamp with time zone,
    status public.job_status DEFAULT 'DRAFT'::public.job_status NOT NULL,
    view_count integer DEFAULT 0 NOT NULL,
    application_count integer DEFAULT 0 NOT NULL,
    closed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    categories text[] DEFAULT '{}'::text[],
    is_sample boolean DEFAULT false,
    detail_images jsonb DEFAULT '[]'::jsonb,
    hiring_process jsonb DEFAULT '[]'::jsonb,
    notes text,
    benefits text,
    created_by text,
    employment_type text,
    benefit_tags text[] DEFAULT '{}'::text[],
    product_type text DEFAULT 'FREE'::text NOT NULL,
    product_expires_at timestamp with time zone,
    work_days text,
    work_time text,
    work_time_slots text,
    source text DEFAULT 'NATIVE'::text NOT NULL,
    external_company_id uuid,
    apply_method text DEFAULT 'NATIVE'::text NOT NULL,
    external_apply_url text,
    external_contact_email text,
    responsibilities text,
    external_contact_name text,
    external_contact_phone text,
    headcount integer,
    contact_methods text[] DEFAULT '{}'::text[] NOT NULL,
    work_period text,
    education text,
    source_url text,
    salary_text text,
    headcount_text text,
    gender_preference text,
    salary_by_category jsonb,
    positions jsonb,
    cover_images jsonb,
    source_checked_at timestamp with time zone,
    work_locations jsonb,
    contact_public boolean DEFAULT true NOT NULL,
    external_contact_kakao text,
    contact_name_hidden boolean DEFAULT true NOT NULL,
    contact_phone_hidden boolean DEFAULT true NOT NULL,
    contact_email_hidden boolean DEFAULT true NOT NULL,
    contact_kakao_hidden boolean DEFAULT true NOT NULL,
    main_impressions bigint DEFAULT 0 NOT NULL,
    free_slot boolean DEFAULT false NOT NULL
);


--
-- Name: COLUMN job_postings.free_slot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.job_postings.free_slot IS '무료(스타트) 칸을 써서 걸린 적이 있는 공고';


--
-- Name: launch_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.launch_tasks (
    id text NOT NULL,
    status text DEFAULT 'todo'::text NOT NULL,
    note text,
    done_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: newsletter_subscribers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.newsletter_subscribers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email text NOT NULL,
    source text DEFAULT 'banner'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: newsletters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.newsletters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    intro text,
    content_html text NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    source text DEFAULT 'ai'::text NOT NULL,
    sent_at timestamp with time zone,
    sent_count integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    target_count integer
);


--
-- Name: notices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type text DEFAULT 'notice'::text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    status text DEFAULT 'published'::text NOT NULL,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    target text DEFAULT 'all'::text NOT NULL,
    short_title text,
    banner_image_url text
);


--
-- Name: COLUMN notices.short_title; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notices.short_title IS '좁은 자리(메인 배너 등)에 거는 짧은 제목. 비면 title 을 쓴다';


--
-- Name: COLUMN notices.banner_image_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notices.banner_image_url IS '본문 위에 거는 배너 그림 경로. 비면 그림 없이 글자만 보여준다';


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    company_id uuid,
    type public.notif_type NOT NULL,
    title character varying(200) NOT NULL,
    message text,
    is_read boolean DEFAULT false NOT NULL,
    related_id uuid,
    related_type character varying(30),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_notif_receiver CHECK ((((user_id IS NOT NULL) AND (company_id IS NULL)) OR ((user_id IS NULL) AND (company_id IS NOT NULL))))
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_type text NOT NULL,
    owner_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT password_reset_tokens_owner_type_check CHECK ((owner_type = ANY (ARRAY['user'::text, 'company'::text])))
);


--
-- Name: phone_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phone_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone text NOT NULL,
    code text NOT NULL,
    purpose text DEFAULT 'signup'::text NOT NULL,
    verified boolean DEFAULT false NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    attempts integer DEFAULT 0 NOT NULL
);


--
-- Name: proposal_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proposal_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    proposal_id uuid NOT NULL,
    sender text NOT NULL,
    kind text DEFAULT 'TEXT'::text NOT NULL,
    body text,
    appointment_at timestamp with time zone,
    appointment_status text,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    appointment_place text,
    reminded_at timestamp with time zone,
    CONSTRAINT proposal_messages_appointment_status_check CHECK ((appointment_status = ANY (ARRAY['PROPOSED'::text, 'ACCEPTED'::text, 'DECLINED'::text, 'CANCELED'::text]))),
    CONSTRAINT proposal_messages_kind_check CHECK ((kind = ANY (ARRAY['TEXT'::text, 'APPOINTMENT'::text]))),
    CONSTRAINT proposal_messages_sender_check CHECK ((sender = ANY (ARRAY['USER'::text, 'COMPANY'::text])))
);


--
-- Name: proposal_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proposal_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    proposal_id uuid NOT NULL,
    reporter text NOT NULL,
    reason text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT proposal_reports_reporter_check CHECK ((reporter = ANY (ARRAY['USER'::text, 'COMPANY'::text])))
);


--
-- Name: proposals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.proposals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    job_posting_id uuid NOT NULL,
    message text DEFAULT ''::text NOT NULL,
    read_at timestamp with time zone,
    hidden_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    interested_at timestamp with time zone,
    interest_message text,
    last_message_at timestamp with time zone,
    declined_at timestamp with time zone,
    note text,
    position_index integer,
    canceled_at timestamp with time zone,
    decline_reason text
);


--
-- Name: COLUMN proposals.position_index; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proposals.position_index IS 'job_postings.positions 배열에서 제안한 자리의 번호(0부터). 옛 제안은 비어 있다.';


--
-- Name: COLUMN proposals.canceled_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.proposals.canceled_at IS '기업이 제안을 거둔 시각. 수락 전에만 가능.';


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    owner_type public.actor_type NOT NULL,
    token_hash character varying(255) NOT NULL,
    device_info text,
    ip_address inet,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: resume_careers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resume_careers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resume_id uuid NOT NULL,
    company_name character varying(100) NOT NULL,
    "position" character varying(100),
    department character varying(100),
    start_date date NOT NULL,
    end_date date,
    is_current boolean DEFAULT false NOT NULL,
    description text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: resume_educations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resume_educations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resume_id uuid NOT NULL,
    school_name character varying(100) NOT NULL,
    major character varying(100),
    degree public.degree_type,
    start_date date,
    end_date date,
    graduation_status public.grad_status,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: resume_skills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resume_skills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resume_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    skill_type public.skill_type,
    level character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: resumes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resumes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title character varying(100) NOT NULL,
    job_type public.job_type NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    desired_job_category_id uuid,
    desired_location text,
    desired_salary_min integer,
    desired_salary_max integer,
    desired_salary_type public.salary_type,
    introduction text,
    desired_countries jsonb,
    career_type public.career_type,
    desired_work_type public.desired_work_type,
    desired_work_days jsonb,
    desired_work_hours character varying(50),
    status public.resume_status DEFAULT 'DRAFT'::public.resume_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: site_visits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.site_visits (
    visitor_key text NOT NULL,
    visit_date date NOT NULL,
    user_id uuid,
    last_visit_at timestamp with time zone DEFAULT now() NOT NULL,
    channel text,
    utm_source text,
    utm_medium text,
    utm_campaign text
);


--
-- Name: COLUMN site_visits.channel; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_visits.channel IS '그날 첫 핑에서 가른 유입 채널 — UTM 있으면 UTM 기준, 없으면 referrer 기준';


--
-- Name: COLUMN site_visits.utm_campaign; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.site_visits.utm_campaign IS '광고·이벤트·제휴·문자 등 캠페인별 성과를 보려고 남기는 원본 utm_campaign 값';


--
-- Name: talent_recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.talent_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    job_posting_id uuid NOT NULL,
    user_id uuid NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    token text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    responded_at timestamp with time zone,
    notified_company_at timestamp with time zone,
    CONSTRAINT talent_recommendations_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'INTERESTED'::text, 'DECLINED'::text])))
);


--
-- Name: talent_scraps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.talent_scraps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: target_companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.target_companies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    group_name text NOT NULL,
    seq integer,
    brand_name text NOT NULL,
    category text,
    homepage text,
    is_hiring text DEFAULT '미확인'::text NOT NULL,
    is_registered text DEFAULT '미등록'::text NOT NULL,
    phone text,
    email text,
    scale text,
    features text,
    note text,
    found_jobs jsonb DEFAULT '[]'::jsonb NOT NULL,
    found_count integer DEFAULT 0 NOT NULL,
    last_checked_at timestamp with time zone,
    linked_company_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    instagram text,
    job_phone_flags jsonb DEFAULT '{}'::jsonb NOT NULL
);


--
-- Name: term_agreements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.term_agreements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid NOT NULL,
    owner_type character varying(10) NOT NULL,
    term_id uuid NOT NULL,
    agreed_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address inet,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    withdrawn_at timestamp with time zone,
    CONSTRAINT term_agreements_owner_type_check CHECK (((owner_type)::text = ANY (ARRAY[('user'::character varying)::text, ('company'::character varying)::text])))
);


--
-- Name: terms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.terms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    type public.term_type NOT NULL,
    version character varying(20) NOT NULL,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    is_required boolean DEFAULT true NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    effective_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: test_case_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_case_runs (
    case_id text NOT NULL,
    area text NOT NULL,
    result text NOT NULL,
    note text,
    report_id uuid,
    ran_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: test_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id text,
    area text NOT NULL,
    title text NOT NULL,
    severity text DEFAULT '정해야 함'::text NOT NULL,
    status text DEFAULT 'open'::text NOT NULL,
    steps text,
    expected text,
    actual text,
    options jsonb DEFAULT '[]'::jsonb NOT NULL,
    decided_by text,
    decision text,
    decided_at timestamp with time zone,
    ref_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reported_by text DEFAULT 'claude'::text NOT NULL,
    as_who text,
    env text
);


--
-- Name: user_careers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_careers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    company character varying(200) NOT NULL,
    department character varying(100) DEFAULT ''::character varying,
    "position" character varying(100) DEFAULT ''::character varying,
    start_date character varying(10) NOT NULL,
    end_date character varying(20) DEFAULT ''::character varying,
    is_verified boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    description text DEFAULT ''::text,
    company_public boolean DEFAULT true NOT NULL
);


--
-- Name: user_certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_certificates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    issuer text DEFAULT ''::text,
    issued_ym text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_company_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_company_blocks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    company_id uuid NOT NULL,
    company_name text,
    created_at timestamp with time zone DEFAULT now(),
    blocked_by text DEFAULT 'USER'::text NOT NULL,
    CONSTRAINT user_company_blocks_blocked_by_check CHECK ((blocked_by = ANY (ARRAY['USER'::text, 'COMPANY'::text])))
);


--
-- Name: user_educations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_educations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    school character varying(200) NOT NULL,
    major character varying(100) DEFAULT ''::character varying,
    status character varying(20) DEFAULT ''::character varying,
    start_date character varying(10),
    end_date character varying(10),
    description text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now(),
    level text DEFAULT ''::text NOT NULL
);


--
-- Name: user_experiences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_experiences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    category character varying(50),
    title character varying(200) NOT NULL,
    description text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT now(),
    start_date text,
    end_date text,
    status text
);


--
-- Name: user_languages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_languages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    language character varying(50) NOT NULL,
    level character varying(50),
    test character varying(100) DEFAULT ''::character varying,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    category character varying(50),
    url text NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    user_id uuid NOT NULL,
    intro text DEFAULT ''::text,
    core_competencies text DEFAULT ''::text,
    main_job_group character varying(100) DEFAULT ''::character varying,
    sub_job character varying(100) DEFAULT ''::character varying,
    is_career_verified boolean DEFAULT false,
    verified_date character varying(20) DEFAULT ''::character varying,
    skills text[] DEFAULT ARRAY[]::text[],
    skill_areas text[] DEFAULT ARRAY[]::text[],
    certificates text[] DEFAULT ARRAY[]::text[],
    work_type_prefer character varying(50) DEFAULT ''::character varying,
    region_prefer character varying(200) DEFAULT ''::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    office_job_areas text[] DEFAULT ARRAY[]::text[],
    is_entry_level boolean DEFAULT false NOT NULL,
    entry_experience text DEFAULT ''::text NOT NULL,
    job_search_status public.job_search_status DEFAULT 'SEEKING'::public.job_search_status NOT NULL,
    job_search_status_at timestamp with time zone,
    cover_letter text,
    salary_type text,
    salary_min bigint,
    career_stage text,
    available_from text
);


--
-- Name: COLUMN user_profiles.career_stage; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.user_profiles.career_stage IS '본인이 고른 경력 단계. 직군 대분류마다 사다리가 다르다(lib/data/jobGroups.ts 의 경력단계).';


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    phone character varying(20),
    name character varying(50) NOT NULL,
    email public.citext,
    password_hash character varying(255),
    job_type public.job_type,
    profile_image_url text,
    birth_date date,
    status public.user_status DEFAULT 'ACTIVE'::public.user_status NOT NULL,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    kakao_id text,
    naver_id text,
    portfolio_uploaded_at timestamp with time zone,
    avatar_url text,
    gender character varying(10),
    office_job_areas text[] DEFAULT '{}'::text[],
    is_sample boolean DEFAULT false,
    address_road text,
    address_detail text,
    region_sido text,
    region_sigungu text,
    preferred_regions jsonb DEFAULT '[]'::jsonb,
    notification_settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    withdrawn_at timestamp without time zone,
    resume_file_url text,
    resume_file_name text,
    resume_file_size integer,
    resume_file_uploaded_at timestamp with time zone,
    email_verified boolean DEFAULT false NOT NULL,
    email_bounced boolean DEFAULT false NOT NULL,
    portfolio_images jsonb,
    avatar_public boolean DEFAULT true NOT NULL,
    nationality text,
    signup_channel text,
    signup_campaign text,
    is_test_account boolean DEFAULT false NOT NULL
);


--
-- Name: COLUMN users.signup_channel; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.signup_channel IS '가입 당시 유입 채널(네이버 검색·인스타그램·카카오톡·UTM 라벨 등). 이전 가입자는 비어 있다';


--
-- Name: COLUMN users.is_test_account; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.users.is_test_account IS '런칭 전 알바 테스트용 계정 — 10/12 전 전량 삭제 대상';


--
-- Name: v_active_jobs; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_active_jobs AS
 SELECT jp.id,
    jp.company_id,
    jp.title,
    jp.job_type,
    jp.job_category_id,
    jp.description,
    jp.requirements,
    jp.preferred_qualifications,
    jp.salary_min,
    jp.salary_max,
    jp.salary_type,
    jp.location,
    jp.address,
    jp.work_type,
    jp.experience_level,
    jp.deadline,
    jp.is_featured,
    jp.featured_until,
    jp.status,
    jp.view_count,
    jp.application_count,
    jp.closed_at,
    jp.created_at,
    jp.updated_at,
    COALESCE(c.company_name, (ec.name)::character varying) AS company_name,
    c.brand_name,
    COALESCE(c.logo_url, ec.logo_url) AS logo_url,
    c.company_type,
    jp.categories,
    jp.employment_type,
    jp.benefit_tags,
    c.cover_images,
    c.signboard_url,
    jp.is_sample,
    jp.main_impressions,
        CASE
            WHEN ((c.paid_until IS NOT NULL) AND (c.paid_until >= CURRENT_DATE)) THEN c.plan
            ELSE NULL::text
        END AS company_plan
   FROM ((public.job_postings jp
     LEFT JOIN public.companies c ON ((c.id = jp.company_id)))
     LEFT JOIN public.external_companies ec ON ((ec.id = jp.external_company_id)))
  WHERE ((jp.status = 'ACTIVE'::public.job_status) AND ((jp.deadline IS NULL) OR (jp.deadline >= CURRENT_DATE)));


--
-- Name: v_job_applicant_counts; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_job_applicant_counts AS
 SELECT job_posting_id,
    count(*) AS total,
    count(*) FILTER (WHERE (status = 'APPLIED'::public.app_status)) AS applied,
    count(*) FILTER (WHERE (status = 'VIEWED'::public.app_status)) AS viewed,
    count(*) FILTER (WHERE (status = 'INTERVIEW'::public.app_status)) AS interview,
    count(*) FILTER (WHERE (status = 'PASSED'::public.app_status)) AS passed,
    count(*) FILTER (WHERE (status = 'REJECTED'::public.app_status)) AS rejected
   FROM public.applications
  GROUP BY job_posting_id;


--
-- Name: visibility_upgrades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.visibility_upgrades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_posting_id uuid NOT NULL,
    company_id uuid NOT NULL,
    plan_type public.visibility_plan NOT NULL,
    started_at timestamp with time zone NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    payment_amount integer NOT NULL,
    payment_status public.payment_status DEFAULT 'PENDING'::public.payment_status NOT NULL,
    pg_order_id character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_vu_dates CHECK ((expires_at > started_at))
);


--
-- Name: ad_inquiries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_inquiries ALTER COLUMN id SET DEFAULT nextval('public.ad_inquiries_id_seq'::regclass);


--
-- Name: inquiry_files id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquiry_files ALTER COLUMN id SET DEFAULT nextval('public.inquiry_files_id_seq'::regclass);


--
-- Name: activity_events activity_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_events
    ADD CONSTRAINT activity_events_pkey PRIMARY KEY (id);


--
-- Name: ad_inquiries ad_inquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ad_inquiries
    ADD CONSTRAINT ad_inquiries_pkey PRIMARY KEY (id);


--
-- Name: admin_users admin_users_login_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_login_id_key UNIQUE (login_id);


--
-- Name: admin_users admin_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_users
    ADD CONSTRAINT admin_users_pkey PRIMARY KEY (id);


--
-- Name: admin_work_sessions admin_work_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_work_sessions
    ADD CONSTRAINT admin_work_sessions_pkey PRIMARY KEY (id);


--
-- Name: ai_usage ai_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage
    ADD CONSTRAINT ai_usage_pkey PRIMARY KEY (user_id, day, kind);


--
-- Name: app_notes app_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_notes
    ADD CONSTRAINT app_notes_pkey PRIMARY KEY (key);


--
-- Name: app_settings app_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_settings
    ADD CONSTRAINT app_settings_pkey PRIMARY KEY (key);


--
-- Name: application_drafts application_drafts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_drafts
    ADD CONSTRAINT application_drafts_pkey PRIMARY KEY (user_id, job_posting_id);


--
-- Name: applications applications_job_posting_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_job_posting_id_user_id_key UNIQUE (job_posting_id, user_id);


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_pkey PRIMARY KEY (id);


--
-- Name: benefit_tags benefit_tags_name_job_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benefit_tags
    ADD CONSTRAINT benefit_tags_name_job_type_key UNIQUE (name, job_type);


--
-- Name: benefit_tags benefit_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benefit_tags
    ADD CONSTRAINT benefit_tags_pkey PRIMARY KEY (id);


--
-- Name: bookmarks bookmarks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_pkey PRIMARY KEY (id);


--
-- Name: bookmarks bookmarks_user_id_job_posting_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_user_id_job_posting_id_key UNIQUE (user_id, job_posting_id);


--
-- Name: community_comments community_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_comments
    ADD CONSTRAINT community_comments_pkey PRIMARY KEY (id);


--
-- Name: community_likes community_likes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_likes
    ADD CONSTRAINT community_likes_pkey PRIMARY KEY (id);


--
-- Name: community_likes community_likes_post_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_likes
    ADD CONSTRAINT community_likes_post_id_user_id_key UNIQUE (post_id, user_id);


--
-- Name: community_posts community_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_posts
    ADD CONSTRAINT community_posts_pkey PRIMARY KEY (id);


--
-- Name: community_reports community_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_reports
    ADD CONSTRAINT community_reports_pkey PRIMARY KEY (id);


--
-- Name: companies companies_business_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_business_number_key UNIQUE (business_number);


--
-- Name: companies companies_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_email_key UNIQUE (email);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_orders company_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_orders
    ADD CONSTRAINT company_orders_pkey PRIMARY KEY (id);


--
-- Name: company_talent_scraps company_talent_scraps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_talent_scraps
    ADD CONSTRAINT company_talent_scraps_pkey PRIMARY KEY (id);


--
-- Name: email_failures email_failures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_failures
    ADD CONSTRAINT email_failures_pkey PRIMARY KEY (id);


--
-- Name: external_companies external_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_companies
    ADD CONSTRAINT external_companies_pkey PRIMARY KEY (id);


--
-- Name: external_job_inbox external_job_inbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_job_inbox
    ADD CONSTRAINT external_job_inbox_pkey PRIMARY KEY (id);


--
-- Name: external_job_inbox external_job_inbox_url_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_job_inbox
    ADD CONSTRAINT external_job_inbox_url_key UNIQUE (url);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: inquiries inquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquiries
    ADD CONSTRAINT inquiries_pkey PRIMARY KEY (id);


--
-- Name: inquiry_files inquiry_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inquiry_files
    ADD CONSTRAINT inquiry_files_pkey PRIMARY KEY (id);


--
-- Name: insights insights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insights
    ADD CONSTRAINT insights_pkey PRIMARY KEY (id);


--
-- Name: job_categories job_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_categories
    ADD CONSTRAINT job_categories_pkey PRIMARY KEY (id);


--
-- Name: job_image_hashes job_image_hashes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_image_hashes
    ADD CONSTRAINT job_image_hashes_pkey PRIMARY KEY (posting_url, image_url);


--
-- Name: job_postings job_postings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_postings
    ADD CONSTRAINT job_postings_pkey PRIMARY KEY (id);


--
-- Name: launch_tasks launch_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.launch_tasks
    ADD CONSTRAINT launch_tasks_pkey PRIMARY KEY (id);


--
-- Name: newsletter_subscribers newsletter_subscribers_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_email_key UNIQUE (email);


--
-- Name: newsletter_subscribers newsletter_subscribers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletter_subscribers
    ADD CONSTRAINT newsletter_subscribers_pkey PRIMARY KEY (id);


--
-- Name: newsletters newsletters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.newsletters
    ADD CONSTRAINT newsletters_pkey PRIMARY KEY (id);


--
-- Name: notices notices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notices
    ADD CONSTRAINT notices_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- Name: phone_verifications phone_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phone_verifications
    ADD CONSTRAINT phone_verifications_pkey PRIMARY KEY (id);


--
-- Name: proposal_messages proposal_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_messages
    ADD CONSTRAINT proposal_messages_pkey PRIMARY KEY (id);


--
-- Name: proposal_reports proposal_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_reports
    ADD CONSTRAINT proposal_reports_pkey PRIMARY KEY (id);


--
-- Name: proposals proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: resume_careers resume_careers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_careers
    ADD CONSTRAINT resume_careers_pkey PRIMARY KEY (id);


--
-- Name: resume_educations resume_educations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_educations
    ADD CONSTRAINT resume_educations_pkey PRIMARY KEY (id);


--
-- Name: resume_skills resume_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_skills
    ADD CONSTRAINT resume_skills_pkey PRIMARY KEY (id);


--
-- Name: resumes resumes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resumes
    ADD CONSTRAINT resumes_pkey PRIMARY KEY (id);


--
-- Name: resumes resumes_user_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resumes
    ADD CONSTRAINT resumes_user_id_unique UNIQUE (user_id);


--
-- Name: site_visits site_visits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.site_visits
    ADD CONSTRAINT site_visits_pkey PRIMARY KEY (visitor_key, visit_date);


--
-- Name: talent_recommendations talent_recommendations_company_id_job_posting_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.talent_recommendations
    ADD CONSTRAINT talent_recommendations_company_id_job_posting_id_user_id_key UNIQUE (company_id, job_posting_id, user_id);


--
-- Name: talent_recommendations talent_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.talent_recommendations
    ADD CONSTRAINT talent_recommendations_pkey PRIMARY KEY (id);


--
-- Name: talent_scraps talent_scraps_company_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.talent_scraps
    ADD CONSTRAINT talent_scraps_company_id_user_id_key UNIQUE (company_id, user_id);


--
-- Name: talent_scraps talent_scraps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.talent_scraps
    ADD CONSTRAINT talent_scraps_pkey PRIMARY KEY (id);


--
-- Name: target_companies target_companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_companies
    ADD CONSTRAINT target_companies_pkey PRIMARY KEY (id);


--
-- Name: term_agreements term_agreements_owner_id_term_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.term_agreements
    ADD CONSTRAINT term_agreements_owner_id_term_id_key UNIQUE (owner_id, term_id);


--
-- Name: term_agreements term_agreements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.term_agreements
    ADD CONSTRAINT term_agreements_pkey PRIMARY KEY (id);


--
-- Name: terms terms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terms
    ADD CONSTRAINT terms_pkey PRIMARY KEY (id);


--
-- Name: terms terms_type_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.terms
    ADD CONSTRAINT terms_type_version_key UNIQUE (type, version);


--
-- Name: test_case_runs test_case_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_case_runs
    ADD CONSTRAINT test_case_runs_pkey PRIMARY KEY (case_id);


--
-- Name: test_reports test_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_reports
    ADD CONSTRAINT test_reports_pkey PRIMARY KEY (id);


--
-- Name: user_careers user_careers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_careers
    ADD CONSTRAINT user_careers_pkey PRIMARY KEY (id);


--
-- Name: user_certificates user_certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_certificates
    ADD CONSTRAINT user_certificates_pkey PRIMARY KEY (id);


--
-- Name: user_company_blocks user_company_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_company_blocks
    ADD CONSTRAINT user_company_blocks_pkey PRIMARY KEY (id);


--
-- Name: user_company_blocks user_company_blocks_user_id_company_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_company_blocks
    ADD CONSTRAINT user_company_blocks_user_id_company_id_key UNIQUE (user_id, company_id);


--
-- Name: user_educations user_educations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_educations
    ADD CONSTRAINT user_educations_pkey PRIMARY KEY (id);


--
-- Name: user_experiences user_experiences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_experiences
    ADD CONSTRAINT user_experiences_pkey PRIMARY KEY (id);


--
-- Name: user_languages user_languages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_languages
    ADD CONSTRAINT user_languages_pkey PRIMARY KEY (id);


--
-- Name: user_links user_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_links
    ADD CONSTRAINT user_links_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (user_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_kakao_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_kakao_id_key UNIQUE (kakao_id);


--
-- Name: users users_naver_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_naver_id_key UNIQUE (naver_id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_phone_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_phone_unique UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: visibility_upgrades visibility_upgrades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visibility_upgrades
    ADD CONSTRAINT visibility_upgrades_pkey PRIMARY KEY (id);


--
-- Name: company_orders_company_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX company_orders_company_idx ON public.company_orders USING btree (company_id, created_at DESC);


--
-- Name: company_orders_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX company_orders_status_idx ON public.company_orders USING btree (status, created_at DESC);


--
-- Name: company_talent_scraps_company_user_job_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX company_talent_scraps_company_user_job_key ON public.company_talent_scraps USING btree (company_id, user_id, job_posting_id) NULLS NOT DISTINCT;


--
-- Name: idx_activity_actor_kind; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_actor_kind ON public.activity_events USING btree (actor_id, kind, created_at DESC);


--
-- Name: idx_activity_kind_day; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_kind_day ON public.activity_events USING btree (kind, day);


--
-- Name: idx_ad_inquiries_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_inquiries_created ON public.ad_inquiries USING btree (created_at DESC);


--
-- Name: idx_ad_inquiries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ad_inquiries_status ON public.ad_inquiries USING btree (status);


--
-- Name: idx_admin_work_sessions_admin_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_work_sessions_admin_started ON public.admin_work_sessions USING btree (admin_id, started_at DESC);


--
-- Name: idx_applications_delivery; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_applications_delivery ON public.applications USING btree (delivery_status);


--
-- Name: idx_apps_applied; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apps_applied ON public.applications USING btree (applied_at DESC);


--
-- Name: idx_apps_job; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apps_job ON public.applications USING btree (job_posting_id, status);


--
-- Name: idx_apps_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_apps_user ON public.applications USING btree (user_id, status);


--
-- Name: idx_benefit_tags_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_benefit_tags_owner ON public.benefit_tags USING btree (created_by_company_id) WHERE (created_by_company_id IS NOT NULL);


--
-- Name: idx_bookmarks_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookmarks_user ON public.bookmarks USING btree (user_id, created_at DESC);


--
-- Name: idx_careers_resume; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_careers_resume ON public.resume_careers USING btree (resume_id, sort_order);


--
-- Name: idx_cat_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cat_parent ON public.job_categories USING btree (parent_id);


--
-- Name: idx_ccomments_post; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ccomments_post ON public.community_comments USING btree (post_id, created_at);


--
-- Name: idx_clikes_post; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_clikes_post ON public.community_likes USING btree (post_id);


--
-- Name: idx_companies_is_member; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_companies_is_member ON public.companies USING btree (is_member);


--
-- Name: idx_companies_merged_into; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_companies_merged_into ON public.companies USING btree (merged_into_company_id);


--
-- Name: idx_company_talent_scraps_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_talent_scraps_company ON public.company_talent_scraps USING btree (company_id);


--
-- Name: idx_company_talent_scraps_job; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_talent_scraps_job ON public.company_talent_scraps USING btree (job_posting_id);


--
-- Name: idx_company_talent_scraps_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_company_talent_scraps_user ON public.company_talent_scraps USING btree (user_id);


--
-- Name: idx_cposts_status_pub; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cposts_status_pub ON public.community_posts USING btree (status, published_at DESC);


--
-- Name: idx_educations_resume; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_educations_resume ON public.resume_educations USING btree (resume_id, sort_order);


--
-- Name: idx_eji_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eji_source ON public.external_job_inbox USING btree (source, closed_at, first_seen DESC);


--
-- Name: idx_eji_source_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_eji_source_key ON public.external_job_inbox USING btree (source, source_key);


--
-- Name: idx_email_failures_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_failures_created ON public.email_failures USING btree (created_at DESC);


--
-- Name: idx_files_uploader; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_files_uploader ON public.files USING btree (uploader_id, uploader_type);


--
-- Name: idx_inquiries_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inquiries_created_at ON public.inquiries USING btree (created_at DESC);


--
-- Name: idx_inquiries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inquiries_status ON public.inquiries USING btree (status);


--
-- Name: idx_job_image_hashes_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_image_hashes_hash ON public.job_image_hashes USING btree (hash);


--
-- Name: idx_job_image_hashes_posting; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_image_hashes_posting ON public.job_image_hashes USING btree (posting_url);


--
-- Name: idx_job_postings_external_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_postings_external_company ON public.job_postings USING btree (external_company_id);


--
-- Name: idx_job_postings_free_slot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_postings_free_slot ON public.job_postings USING btree (company_id) WHERE free_slot;


--
-- Name: idx_job_postings_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_postings_source ON public.job_postings USING btree (source);


--
-- Name: idx_job_postings_source_checked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_postings_source_checked ON public.job_postings USING btree (source_checked_at NULLS FIRST) WHERE ((status = 'ACTIVE'::public.job_status) AND (source_url IS NOT NULL));


--
-- Name: idx_jobs_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_company ON public.job_postings USING btree (company_id, status);


--
-- Name: idx_jobs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_created ON public.job_postings USING btree (created_at DESC);


--
-- Name: idx_jobs_deadline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_deadline ON public.job_postings USING btree (deadline) WHERE (deadline IS NOT NULL);


--
-- Name: idx_jobs_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_featured ON public.job_postings USING btree (is_featured, featured_until) WHERE (is_featured = true);


--
-- Name: idx_jobs_status_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_status_type ON public.job_postings USING btree (status, job_type);


--
-- Name: idx_notices_list; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notices_list ON public.notices USING btree (status, is_pinned DESC, published_at DESC, created_at DESC);


--
-- Name: idx_notif_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_company ON public.notifications USING btree (company_id, is_read, created_at DESC) WHERE (company_id IS NOT NULL);


--
-- Name: idx_notif_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notif_user ON public.notifications USING btree (user_id, is_read, created_at DESC) WHERE (user_id IS NOT NULL);


--
-- Name: idx_phone_verifications_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phone_verifications_lookup ON public.phone_verifications USING btree (phone, purpose, verified, expires_at DESC);


--
-- Name: idx_phone_verifications_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phone_verifications_phone ON public.phone_verifications USING btree (phone, purpose);


--
-- Name: idx_phone_verifications_phone_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phone_verifications_phone_created ON public.phone_verifications USING btree (phone, created_at DESC);


--
-- Name: idx_proposal_messages_thread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proposal_messages_thread ON public.proposal_messages USING btree (proposal_id, created_at);


--
-- Name: idx_proposal_reports_new; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proposal_reports_new ON public.proposal_reports USING btree (created_at DESC);


--
-- Name: idx_proposals_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proposals_company ON public.proposals USING btree (company_id, created_at DESC);


--
-- Name: idx_proposals_company_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proposals_company_user ON public.proposals USING btree (company_id, user_id);


--
-- Name: idx_proposals_interested; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proposals_interested ON public.proposals USING btree (company_id, interested_at DESC) WHERE (interested_at IS NOT NULL);


--
-- Name: idx_proposals_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proposals_user ON public.proposals USING btree (user_id, created_at DESC);


--
-- Name: idx_prt_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prt_owner ON public.password_reset_tokens USING btree (owner_type, owner_id);


--
-- Name: idx_prt_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prt_token ON public.password_reset_tokens USING btree (token);


--
-- Name: idx_resumes_public; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resumes_public ON public.resumes USING btree (is_public, job_type) WHERE (is_public = true);


--
-- Name: idx_resumes_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resumes_user ON public.resumes USING btree (user_id);


--
-- Name: idx_rt_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rt_hash ON public.refresh_tokens USING btree (token_hash);


--
-- Name: idx_rt_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rt_owner ON public.refresh_tokens USING btree (owner_id, owner_type);


--
-- Name: idx_rt_valid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_rt_valid ON public.refresh_tokens USING btree (owner_id) WHERE (revoked_at IS NULL);


--
-- Name: idx_site_visits_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_site_visits_date ON public.site_visits USING btree (visit_date);


--
-- Name: idx_skills_resume; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_skills_resume ON public.resume_skills USING btree (resume_id);


--
-- Name: idx_ta_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ta_owner ON public.term_agreements USING btree (owner_id, owner_type);


--
-- Name: idx_target_companies_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_companies_brand ON public.target_companies USING btree (brand_name);


--
-- Name: idx_target_companies_group; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_companies_group ON public.target_companies USING btree (group_name);


--
-- Name: idx_target_companies_hiring; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_companies_hiring ON public.target_companies USING btree (is_hiring);


--
-- Name: idx_target_companies_reg; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_companies_reg ON public.target_companies USING btree (is_registered);


--
-- Name: idx_test_reports_area; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_reports_area ON public.test_reports USING btree (area);


--
-- Name: idx_test_reports_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_test_reports_status ON public.test_reports USING btree (status, created_at DESC);


--
-- Name: idx_tscraps_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tscraps_company ON public.talent_scraps USING btree (company_id, created_at DESC);


--
-- Name: idx_user_careers_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_careers_user_id ON public.user_careers USING btree (user_id);


--
-- Name: idx_user_certificates_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_certificates_user_id ON public.user_certificates USING btree (user_id);


--
-- Name: idx_user_educations_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_educations_user_id ON public.user_educations USING btree (user_id);


--
-- Name: idx_user_experiences_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_experiences_user_id ON public.user_experiences USING btree (user_id);


--
-- Name: idx_user_languages_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_languages_user_id ON public.user_languages USING btree (user_id);


--
-- Name: idx_user_links_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_links_user_id ON public.user_links USING btree (user_id);


--
-- Name: idx_user_profiles_main_job; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_main_job ON public.user_profiles USING btree (main_job_group);


--
-- Name: idx_user_profiles_skills; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_profiles_skills ON public.user_profiles USING gin (skills);


--
-- Name: idx_vu_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vu_expires ON public.visibility_upgrades USING btree (expires_at) WHERE (payment_status = 'PAID'::public.payment_status);


--
-- Name: idx_vu_job; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vu_job ON public.visibility_upgrades USING btree (job_posting_id);


--
-- Name: inquiry_files_owner_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX inquiry_files_owner_idx ON public.inquiry_files USING btree (kind, inquiry_id);


--
-- Name: job_postings_main_impressions_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX job_postings_main_impressions_idx ON public.job_postings USING btree (main_impressions);


--
-- Name: proposals_company_user_job_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX proposals_company_user_job_key ON public.proposals USING btree (company_id, user_id, job_posting_id);


--
-- Name: uq_activity_login_day; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_activity_login_day ON public.activity_events USING btree (actor_id, day) WHERE (kind = 'LOGIN_DAY'::text);


--
-- Name: applications trg_applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: companies trg_companies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: job_postings trg_job_postings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_job_postings_updated_at BEFORE UPDATE ON public.job_postings FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: resumes trg_resumes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_resumes_updated_at BEFORE UPDATE ON public.resumes FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: target_companies trg_target_companies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_target_companies_updated_at BEFORE UPDATE ON public.target_companies FOR EACH ROW EXECUTE FUNCTION public.set_target_companies_updated_at();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();


--
-- Name: ai_usage ai_usage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_usage
    ADD CONSTRAINT ai_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: application_drafts application_drafts_job_posting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_drafts
    ADD CONSTRAINT application_drafts_job_posting_id_fkey FOREIGN KEY (job_posting_id) REFERENCES public.job_postings(id) ON DELETE CASCADE;


--
-- Name: application_drafts application_drafts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.application_drafts
    ADD CONSTRAINT application_drafts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: applications applications_job_posting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_job_posting_id_fkey FOREIGN KEY (job_posting_id) REFERENCES public.job_postings(id);


--
-- Name: applications applications_resume_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES public.resumes(id);


--
-- Name: applications applications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.applications
    ADD CONSTRAINT applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: benefit_tags benefit_tags_created_by_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.benefit_tags
    ADD CONSTRAINT benefit_tags_created_by_company_id_fkey FOREIGN KEY (created_by_company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: bookmarks bookmarks_job_posting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_job_posting_id_fkey FOREIGN KEY (job_posting_id) REFERENCES public.job_postings(id) ON DELETE CASCADE;


--
-- Name: bookmarks bookmarks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookmarks
    ADD CONSTRAINT bookmarks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: community_comments community_comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_comments
    ADD CONSTRAINT community_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE;


--
-- Name: community_likes community_likes_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.community_likes
    ADD CONSTRAINT community_likes_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.community_posts(id) ON DELETE CASCADE;


--
-- Name: companies companies_merged_into_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_merged_into_company_id_fkey FOREIGN KEY (merged_into_company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: company_orders company_orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_orders
    ADD CONSTRAINT company_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_talent_scraps company_talent_scraps_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_talent_scraps
    ADD CONSTRAINT company_talent_scraps_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: company_talent_scraps company_talent_scraps_job_posting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_talent_scraps
    ADD CONSTRAINT company_talent_scraps_job_posting_id_fkey FOREIGN KEY (job_posting_id) REFERENCES public.job_postings(id) ON DELETE CASCADE;


--
-- Name: company_talent_scraps company_talent_scraps_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_talent_scraps
    ADD CONSTRAINT company_talent_scraps_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: external_companies external_companies_claimed_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_companies
    ADD CONSTRAINT external_companies_claimed_company_id_fkey FOREIGN KEY (claimed_company_id) REFERENCES public.companies(id) ON DELETE SET NULL;


--
-- Name: job_categories job_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_categories
    ADD CONSTRAINT job_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.job_categories(id);


--
-- Name: job_postings job_postings_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_postings
    ADD CONSTRAINT job_postings_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: job_postings job_postings_external_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_postings
    ADD CONSTRAINT job_postings_external_company_id_fkey FOREIGN KEY (external_company_id) REFERENCES public.external_companies(id) ON DELETE SET NULL;


--
-- Name: job_postings job_postings_job_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_postings
    ADD CONSTRAINT job_postings_job_category_id_fkey FOREIGN KEY (job_category_id) REFERENCES public.job_categories(id);


--
-- Name: notifications notifications_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: proposal_messages proposal_messages_proposal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_messages
    ADD CONSTRAINT proposal_messages_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE CASCADE;


--
-- Name: proposal_reports proposal_reports_proposal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposal_reports
    ADD CONSTRAINT proposal_reports_proposal_id_fkey FOREIGN KEY (proposal_id) REFERENCES public.proposals(id) ON DELETE CASCADE;


--
-- Name: proposals proposals_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: proposals proposals_job_posting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_job_posting_id_fkey FOREIGN KEY (job_posting_id) REFERENCES public.job_postings(id) ON DELETE CASCADE;


--
-- Name: proposals proposals_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.proposals
    ADD CONSTRAINT proposals_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: resume_careers resume_careers_resume_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_careers
    ADD CONSTRAINT resume_careers_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE CASCADE;


--
-- Name: resume_educations resume_educations_resume_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_educations
    ADD CONSTRAINT resume_educations_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE CASCADE;


--
-- Name: resume_skills resume_skills_resume_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resume_skills
    ADD CONSTRAINT resume_skills_resume_id_fkey FOREIGN KEY (resume_id) REFERENCES public.resumes(id) ON DELETE CASCADE;


--
-- Name: resumes resumes_desired_job_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resumes
    ADD CONSTRAINT resumes_desired_job_category_id_fkey FOREIGN KEY (desired_job_category_id) REFERENCES public.job_categories(id);


--
-- Name: resumes resumes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resumes
    ADD CONSTRAINT resumes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: talent_recommendations talent_recommendations_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.talent_recommendations
    ADD CONSTRAINT talent_recommendations_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: talent_recommendations talent_recommendations_job_posting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.talent_recommendations
    ADD CONSTRAINT talent_recommendations_job_posting_id_fkey FOREIGN KEY (job_posting_id) REFERENCES public.job_postings(id) ON DELETE CASCADE;


--
-- Name: talent_recommendations talent_recommendations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.talent_recommendations
    ADD CONSTRAINT talent_recommendations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: talent_scraps talent_scraps_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.talent_scraps
    ADD CONSTRAINT talent_scraps_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;


--
-- Name: talent_scraps talent_scraps_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.talent_scraps
    ADD CONSTRAINT talent_scraps_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: term_agreements term_agreements_term_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.term_agreements
    ADD CONSTRAINT term_agreements_term_id_fkey FOREIGN KEY (term_id) REFERENCES public.terms(id);


--
-- Name: user_careers user_careers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_careers
    ADD CONSTRAINT user_careers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_certificates user_certificates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_certificates
    ADD CONSTRAINT user_certificates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_educations user_educations_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_educations
    ADD CONSTRAINT user_educations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_experiences user_experiences_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_experiences
    ADD CONSTRAINT user_experiences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_languages user_languages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_languages
    ADD CONSTRAINT user_languages_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_links user_links_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_links
    ADD CONSTRAINT user_links_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: visibility_upgrades visibility_upgrades_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visibility_upgrades
    ADD CONSTRAINT visibility_upgrades_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: visibility_upgrades visibility_upgrades_job_posting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.visibility_upgrades
    ADD CONSTRAINT visibility_upgrades_job_posting_id_fkey FOREIGN KEY (job_posting_id) REFERENCES public.job_postings(id);


--
-- Name: admin_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

--
-- Name: applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

--
-- Name: bookmarks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

--
-- Name: companies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

--
-- Name: files; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

--
-- Name: job_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.job_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: job_postings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: resume_careers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resume_careers ENABLE ROW LEVEL SECURITY;

--
-- Name: resume_educations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resume_educations ENABLE ROW LEVEL SECURITY;

--
-- Name: resume_skills; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resume_skills ENABLE ROW LEVEL SECURITY;

--
-- Name: resumes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

--
-- Name: talent_scraps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.talent_scraps ENABLE ROW LEVEL SECURITY;

--
-- Name: term_agreements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.term_agreements ENABLE ROW LEVEL SECURITY;

--
-- Name: terms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.terms ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: visibility_upgrades; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.visibility_upgrades ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict CIIfJlgSdMZy5mQhMj4iCDkJ3DDjy1mHkdhqbR59hOMlVNznqzRh7svMAOrEjIt

