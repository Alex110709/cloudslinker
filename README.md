# CloudsLinker 🌥️

**CloudsLinker**는 여러 클라우드 스토리지 서비스를 통합 관리할 수 있는 플랫폼입니다. PikPak, WebDAV, Synology NAS 등 다양한 클라우드 스토리지 간의 파일 전송과 동기화를 제로 대역폭으로 수행할 수 있습니다.

## ✨ 주요 기능

### 🔗 클라우드 통합
- **PikPak**: OAuth 2.0 인증을 통한 안전한 연결
- **WebDAV**: Basic/Digest 인증 지원
- **Synology NAS**: DSM API를 통한 직접 연결

### 📡 제로 대역폭 전송
- 클라우드 간 직접 전송으로 대역폭 절약
- 스트림 기반 파일 전송으로 메모리 효율성 확보
- 실시간 진행률 모니터링

### 🔄 자동 동기화
- 양방향 및 단방향 동기화 지원
- 유연한 스케줄링 (수동, 주기적, Cron)
- 충돌 해결 전략 설정

### 🌐 다국어 지원
- 한국어/영어 지원
- 실시간 언어 전환

### 📊 실시간 모니터링
- WebSocket 기반 실시간 상태 업데이트
- 전송 속도 및 진행률 추적
- 상세한 로그 및 에러 정보

## 🚀 빠른 시작

### 필수 요구사항
- Node.js 18.0.0 이상
- PostgreSQL 15 이상
- Redis 7 이상
- Docker & Docker Compose (선택사항)

### Docker를 사용한 설치

1. **저장소 클론**
   ```bash
   git clone https://github.com/yourusername/cloudslinker.git
   cd cloudslinker
   ```

2. **환경 변수 설정**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   
   # 필요한 환경 변수들을 수정하세요
   ```

3. **Docker Compose로 실행**
   ```bash
   # 개발 환경
   docker-compose up -d
   
   # 프로덕션 환경
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

4. **접속**
   - 프론트엔드: http://localhost:3000
   - 백엔드 API: http://localhost:3001
   - API 문서: http://localhost:3001/api-docs

### 수동 설치

1. **데이터베이스 설정**
   ```bash
   # PostgreSQL 데이터베이스 생성
   createdb cloudslinker
   
   # Redis 시작
   redis-server
   ```

2. **백엔드 설정**
   ```bash
   cd backend
   npm install
   npm run db:migrate
   npm run dev
   ```

3. **프론트엔드 설정**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## 🏗️ 프로젝트 구조

```
cloudslinker/
├── backend/                 # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── controllers/     # API 컨트롤러
│   │   ├── services/        # 비즈니스 로직
│   │   ├── models/          # 데이터 모델
│   │   ├── routes/          # API 라우트
│   │   ├── middleware/      # Express 미들웨어
│   │   ├── utils/           # 유틸리티 함수
│   │   └── types/           # TypeScript 타입 정의
│   ├── database/            # 데이터베이스 마이그레이션
│   └── docs/                # API 문서화
├── frontend/                # React + TypeScript + Vite
│   ├── src/
│   │   ├── components/      # React 컴포넌트
│   │   ├── store/           # Redux Store
│   │   ├── hooks/           # 커스텀 Hooks
│   │   ├── services/        # API 서비스
│   │   ├── utils/           # 유틸리티 함수
│   │   ├── types/           # TypeScript 타입
│   │   └── i18n/            # 다국어 설정
│   └── public/              # 정적 파일
├── nginx/                   # Nginx 설정 (프로덕션)
├── monitoring/              # 모니터링 설정
└── docker-compose*.yml      # Docker Compose 설정
```

## 🔧 기술 스택

### 프론트엔드
- **React 18** + **TypeScript**
- **Vite** (빌드 도구)
- **Redux Toolkit** + **RTK Query** (상태 관리)
- **Ant Design** + **Tailwind CSS** (UI 라이브러리)
- **React Router v6** (라우팅)
- **i18next** (다국어 지원)
- **Socket.IO Client** (실시간 통신)

### 백엔드
- **Node.js** + **Express** + **TypeScript**
- **PostgreSQL** (메인 데이터베이스)
- **Redis** (캐시 및 세션)
- **Bull Queue** (작업 큐 시스템)
- **Socket.IO** (실시간 통신)
- **JWT** + **OAuth 2.0** (인증)
- **Swagger** (API 문서화)
- **Winston** (로깅)

### 인프라
- **Docker** + **Docker Compose**
- **Nginx** (리버스 프록시)
- **Prometheus** + **Grafana** (모니터링)

## 📚 API 문서

Swagger UI를 통해 API 문서를 확인할 수 있습니다:
- 개발 환경: http://localhost:3001/api-docs
- JSON 스키마: http://localhost:3001/api-docs.json

### 주요 API 엔드포인트

#### 인증
- `POST /api/auth/login` - 로그인
- `POST /api/auth/register` - 회원가입
- `GET /api/auth/profile` - 프로필 조회
- `POST /api/auth/refresh` - 토큰 갱신

#### 클라우드 프로바이더
- `GET /api/clouds` - 연결된 클라우드 목록
- `POST /api/clouds` - 새 클라우드 연결
- `PUT /api/clouds/:id` - 클라우드 설정 수정
- `DELETE /api/clouds/:id` - 클라우드 연결 해제
- `POST /api/clouds/:id/test` - 연결 테스트

#### 파일 전송
- `GET /api/transfers` - 전송 작업 목록
- `POST /api/transfers` - 새 전송 작업 생성
- `GET /api/transfers/:id` - 전송 작업 상세
- `POST /api/transfers/:id/start` - 전송 시작
- `POST /api/transfers/:id/pause` - 전송 일시정지
- `POST /api/transfers/:id/cancel` - 전송 취소

#### 동기화
- `GET /api/sync` - 동기화 작업 목록
- `POST /api/sync` - 새 동기화 작업 생성
- `GET /api/sync/:id` - 동기화 작업 상세
- `PUT /api/sync/:id` - 동기화 설정 수정
- `POST /api/sync/:id/run` - 수동 동기화 실행

## 🧪 테스트

### 프론트엔드 테스트
```
cd frontend
npm test                 # 단위 테스트 실행
npm run test:watch       # 테스트 감시 모드
npm run test:coverage    # 커버리지 리포트
```

### 백엔드 테스트
```
cd backend
npm test                 # 단위 테스트 실행
npm run test:watch       # 테스트 감시 모드
npm run test:coverage    # 커버리지 리포트
```

## 🔒 보안

- JWT 기반 인증 시스템
- OAuth 2.0 지원
- CORS 설정
- Rate Limiting
- 입력 데이터 검증
- 암호화된 비밀번호 저장

## 🌍 배포

### 프로덕션 배포

1. **환경 변수 설정**
   ```bash
   # 프로덕션 환경 변수 파일 생성
   cp .env.example .env.production
   ```

2. **SSL 인증서 설정**
   ```bash
   # SSL 인증서를 ssl/ 디렉토리에 배치
   mkdir ssl
   # certificate.crt, private.key 파일 복사
   ```

3. **프로덕션 배포**
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

### 환경 변수

#### 백엔드 환경 변수
```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://username:password@host:port/database
REDIS_URL=redis://host:port
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h
CORS_ORIGIN=https://yourdomain.com

```

#### 프론트엔드 환경 변수
```
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com

```


## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

MIT License에 따라 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 지원

- 이슈 트래커: [GitHub Issues](https://github.com/yourusername/cloudslinker/issues)
- 이메일: support@cloudslinker.com
- 문서: [Wiki](https://github.com/yourusername/cloudslinker/wiki)

## 🙏 감사의 말

- [Ant Design](https://ant.design/) - 아름다운 React UI 라이브러리
- [Socket.IO](https://socket.io/) - 실시간 통신 라이브러리
- [Bull](https://github.com/OptimalBits/bull) - 강력한 작업 큐 시스템
- [TypeScript](https://www.typescriptlang.org/) - 타입 안정성

---

**CloudsLinker**로 모든 클라우드를 하나로! 🚀
