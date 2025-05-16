# 서비스

### Ticker
1. ticker 정보 확보시 change값이 양수 or 0인 경우 +와 함께 저장, change percent 정보는 %단위의 숫자로 저장 : ex. 0.23% -> 0.23, 90% -> +90.00
2. 


This project implements a simple application with the following features:
1.  서비스 단순 설명 (Service Description)
2.  Counter
3.  To-Do List

# 상세

## 1. 핵심 기술 스택 및 환경

- **주요 기술:** Next.js & TypeScript
- **라우터:** App Router 사용 (Pages Router 사용 안 함)
- **구조:**
    - `src/` 디렉토리 사용
    - App Router 기반, 기능 중심의 코로케이션(colocation) 구조 채택.
        - **공통 레이아웃, 컴포넌트, 훅, 유틸리티 등은 `src/components`, `src/hooks`, `src/lib`, `src/utils` 등 명확한 최상위 폴더에 배치 고려**
- **코드 품질:**
    - ESLint 사용: **Next.js 기본 ESLint 설정 (`eslint-config-next`)을 기반으로, 추가적으로 `eslint-plugin-react`, `eslint-plugin-react-hooks`, `@typescript-eslint/eslint-plugin`, `eslint-plugin-jsx-a11y` 등의 플러그인 사용 권장.**
    - **Prettier 사용: 코드 포맷팅 일관성 유지 (ESLint와 통합하여 사용)**
- **날짜/시간 처리 라이브러리:** Day.js

## 2. UI 및 스타일링

- **UI 컴포넌트 라이브러리:** Material UI (MUI) with Material Design 3 (MD3)
    - **MUI 최신 버전 (v7 이상) 사용** (Note: Will install latest stable MUI v5 which supports MD3)
- **스타일링 방식:** MUI styling solutions 활용
    - `sx` prop
    - `styled()` API
    - 전역 테마 오버라이드 (**`src/theme` 디렉토리 내에서 테마 정의 및 관리**)
- **아이콘 라이브러리:** Material Symbols

## 3. 상태 관리

- **로컬 UI 상태:** `useState` 사용 (컴포넌트 내의 단순한 UI 상태에 한정)
- **이외의 모든 상태:** Zustand 사용
    - **서버 상태(Server State) 관리:** **Zustand를 사용하되, 데이터 Fetching, Caching, Mutation 등이 복잡해질 경우 React Query 서버 상태 관리 라이브러리 사용**

## 4. 반응형 디자인 가이드라인

본 프로젝트는 다양한 디바이스 환경(모바일, 태블릿, PC)에서 최적의 사용자 경험을 제공하기 위해 반응형 웹 디자인을 적용합니다.

- **접근 방식:** 모바일 우선(Mobile-First) 접근 방식을 채택합니다.
- **분기점(Breakpoints):** MUI의 기본 분기점 (또는 테마에 정의된 커스텀 분기점)을 기준으로 반응형 레이아웃을 구현합니다.
- **레이아웃:**
    - 콘텐츠는 MUI의 Layout components (Grid, Box, Stack, Container 등)를 사용하여 화면 크기에 따라 유연하게 조절됩니다.
    - 네비게이션, 카드, 테이블, 폼 등의 주요 컴포넌트는 각 화면 크기별 사용성을 고려하여 적절히 변형됩니다.
        - **모바일:** 간소화된 메뉴 BottomNavigation, 1열 콘텐츠 레이아웃, **터치에 최적화된 인터랙션**
        - **모바일 이외의 경우:** 확장된 메뉴 (persistent Drawer), 다중 열 콘텐츠 레이아웃, **마우스 및 키보드 사용에 최적화된 인터랙션**
- **이미지 및 미디어:** 화면 크기에 맞춰 비율을 유지하며 조절됩니다 (`max-width: 100%; height: auto;`). **(height: auto 추가)**
- **타이포그래피 및 간격:** 가독성을 위해 화면 크기에 따라 글꼴 크기 및 여백이 적절히 조절됩니다. (MUI Theme 및 MD3 type scale 적극 활용)
- **터치 친화성:** 모바일 환경에서의 터치 인터랙션을 고려하여 버튼 크기 및 터치 영역을 충분히 확보합니다. (최소 44px X 44px 권장 - Apple Human Interface Guidelines 참고)
- **구현:**
    - 모든 반응형 스타일은 MUI의 반응형 유틸리티 및 분기점 구문 (예: `sx={{ display: { xs: 'block', md: 'flex' } }}`)을 사용하여 구현합니다.
    - MUI MD3 컴포넌트를 적극 활용하며, 반응형 요구사항에 맞춰 커스터마이징합니다.
