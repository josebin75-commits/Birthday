/**
 * =========================================================================
 * ⚙️ 파이어베이스(Firebase) 실전 배포용 설정 가이드
 * =========================================================================
 * 
 * [1단계] 파이어베이스 프로젝트 생성 및 앱 등록하기
 * 1. 파이어베이스 콘솔(https://console.firebase.google.com/)에 접속하여 구글 로그인합니다.
 * 2. [프로젝트 추가] 버튼을 눌러 프로젝트를 생성합니다. (Google 애널리틱스는 해제하셔도 됩니다.)
 * 3. 프로젝트 생성이 완료되면, 홈 화면 중앙의 웹 아이콘( </> 모양 )을 클릭합니다.
 * 4. 앱 닉네임을 적고 [앱 등록]을 클릭합니다.
 * 
 * [2단계] 설정 코드 복사하여 아래의 객체에 덮어쓰기
 * 5. 앱 등록 완료 후 화면에 나오는 코드 중 `const firebaseConfig = { ... };` 
 *    중괄호 안쪽의 항목들을 그대로 복사하여 아래의 주석 처리된 부분에 덮어쓰기 하거나,
 *    아래 `firebaseConfig` 객체의 값들을 본인의 키로 직접 수정해 주세요.
 */

const firebaseConfig = {
  apiKey: "AIzaSyA9deIbc0kPaFWVKHSZFC--vfEMO1cJWGU",
  authDomain: "hbdletter.firebaseapp.com",
  databaseURL: "https://hbdletter-default-rtdb.firebaseio.com/",
  projectId: "hbdletter",
  storageBucket: "hbdletter.firebasestorage.app",
  messagingSenderId: "907480877696",
  appId: "1:907480877696:web:281ce23ccc8c647e45b465",
  measurementId: "G-E9WDQXT0CF"
};

/**
 * [3단계] 파이어베이스 스토리지 및 Realtime Database 활성화 (필수!)
 * 
 * 1. Realtime Database 활성화:
 *    - 파이어베이스 콘솔 왼쪽 메뉴 -> [빌드] -> [Realtime Database] 클릭 -> [데이터베이스 만들기] 클릭
 *    - 위치 선택 후 [테스트 모드에서 시작] 선택하여 만들기 완료.
 *    - 생성된 후 화면 상단에 보이는 `https://...` 형태의 주소를 복사하여 
 *      위 `firebaseConfig` 안의 `databaseURL` 항목에 입력해 주세요.
 *    - [규칙(Rules)] 탭으로 이동하여 아래와 같이 읽기/쓰기를 true로 수정해 주세요:
 *      { "rules": { ".read": "true", ".write": "true" } }
 * 
 * 2. Firebase Storage 활성화:
 *    - 파이어베이스 콘솔 왼쪽 메뉴 -> [빌드] -> [Storage] 클릭 -> [시작하기] 클릭
 *    - [테스트 모드에서 시작] 선택하여 만들기 완료.
 */
