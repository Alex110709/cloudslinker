# CloudsLinker 🔗

**차세대 클라우드 스토리지 통합 관리 플랫폼**

CloudsLinker는 PikPak, WebDAV, Synology NAS를 핵심으로 지원하는 제로 대역폭 클라우드 간 직접 전송 플랫폼입니다.

## 🌟 핵심 기능

- **제로 로컬 임팩트**: 모든 전송이 클라우드 간 직접 발생하여 로컬 대역폭 소비 없음
- **핵심 프로바이더 지원**: PikPak, WebDAV, Synology NAS 완벽 지원
- **고급 필터링**: 정밀한 파일 선택 및 조건부 전송
- **자동화 작업**: 스케줄링된 동기화 및 멀티태스크 실행
- **실시간 모니터링**: 전송 진행률 및 상태 실시간 추적
- **엔터프라이즈 보안**: 256-bit AES 암호화, OAuth 인증, GDPR 준수

## 🏗️ 아키텍처

### 기술 스택

**프론트엔드**
- React 18+ with TypeScript
- Redux Toolkit + RTK Query
- Ant Design Pro (한국어 지원)
- Tailwind CSS + Styled Components
- Vite 4.0+

**백엔드**
- Node.js 18+ with Express.js
- TypeScript 5.0+
- PostgreSQL 15+ with Redis 7+
- Bull Queue 4.0+ with Redis
- JWT Authentication + OAuth 2.0

**클라우드 통합**
- PikPak OAuth 2.0 SDK
- WebDAV with custom extensions
- Synology DSM API integration

## 🚀 빠른 시작

### 사전 요구사항

- Node.js 18.0.0+
- npm 8.0.0+
- Docker & Docker Compose (개발 환경)

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/cloudslinker/cloudslinker.git
cd cloudslinker

# 의존성 설치
npm install

# Docker 환경 실행 (PostgreSQL + Redis)
docker-compose up -d postgres redis

# 개발 서버 실행
npm run dev
```

웹 애플리케이션: http://localhost:3000
API 서버: http://localhost:3001

### 환경 변수 설정

```bash
# backend/.env
DATABASE_URL=postgresql://cloudslinker:cloudslinker123@localhost:5432/cloudslinker
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret-key-here
CORS_ORIGIN=http://localhost:3000

# PikPak OAuth 설정
PIKPAK_CLIENT_ID=your-pikpak-client-id
PIKPAK_CLIENT_SECRET=your-pikpak-client-secret

# frontend/.env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_NAME=CloudsLinker
```

## 📚 사용법

### 1. 클라우드 프로바이더 연결

1. 대시보드에서 "클라우드 연결" 클릭
2. 원하는 프로바이더 선택 (PikPak, WebDAV, Synology NAS)
3. 인증 정보 입력 또는 OAuth 인증 완료

### 2. 파일 전송 작업 생성

1. "전송 관리" 메뉴 접근
2. 소스 및 대상 클라우드 선택
3. 전송할 파일/폴더 경로 설정
4. 필터링 조건 설정 (선택사항)
5. 전송 작업 시작

### 3. 동기화 작업 설정

1. "동기화 관리" 메뉴 접근
2. 양방향 동기화할 클라우드 선택
3. 동기화 모드 및 스케줄 설정
4. 자동 동기화 작업 활성화

## 🔧 개발

### 프로젝트 구조

```
cloudslinker/
├── frontend/                 # React + TypeScript 프론트엔드
│   ├── src/
│   │   ├── components/      # UI 컴포넌트
│   │   ├── pages/          # 페이지 컴포넌트
│   │   ├── store/          # Redux 상태 관리
│   │   ├── services/       # API 서비스
│   │   └── types/          # TypeScript 타입 정의
│   └── package.json
├── backend/                  # Node.js + Express 백엔드
│   ├── src/
│   │   ├── controllers/    # API 컨트롤러
│   │   ├── services/       # 비즈니스 로직
│   │   ├── models/         # 데이터 모델
│   │   ├── providers/      # 클라우드 프로바이더
│   │   ├── middleware/     # Express 미들웨어
│   │   └── database/       # DB 설정 및 마이그레이션
│   └── package.json
├── docker-compose.yml        # Docker 개발 환경
└── package.json             # 루트 package.json
```

### 스크립트 명령어

```bash
# 전체 개발 서버 실행
npm run dev

# 개별 서비스 실행
npm run dev:frontend    # 프론트엔드만
npm run dev:backend     # 백엔드만

# 빌드
npm run build           # 전체 빌드
npm run build:frontend  # 프론트엔드 빌드
npm run build:backend   # 백엔드 빌드

# 테스트
npm run test            # 전체 테스트
npm run test:frontend   # 프론트엔드 테스트
npm run test:backend    # 백엔드 테스트

# 린팅
npm run lint            # 전체 린팅
npm run lint:frontend   # 프론트엔드 린팅
npm run lint:backend    # 백엔드 린팅
```

## 📖 API 문서

API 문서는 개발 서버 실행 후 다음 주소에서 확인할 수 있습니다:
- Swagger UI: http://localhost:3001/api-docs

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 라이센스

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 지원

- 문제 신고: [GitHub Issues](https://github.com/cloudslinker/cloudslinker/issues)
- 문서: [Documentation](https://docs.cloudslinker.com)
- 이메일: support@cloudslinker.com

---

**CloudsLinker** - 모든 클라우드를 하나로 연결합니다. 🌐