// 1. Firebase 초기화 (Compat API 사용)
let db = null;
try {
  if (typeof firebaseConfig !== 'undefined' && firebaseConfig.apiKey && firebaseConfig.apiKey !== 'YOUR_API_KEY') {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
  } else {
    console.warn("firebaseConfig가 설정되지 않았습니다. 파이어베이스 키 입력을 대기합니다.");
  }
} catch (e) {
  console.error("Firebase 초기화 중 에러 발생:", e);
}

// 업로드할 파일들을 저장할 배열
let selectedFiles = [];

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const viewMode = urlParams.get('view');
  const letterId = urlParams.get('id');

  // 라우팅 분기 처리 (로컬 스토리지 모드 전면 제거)
  if (viewMode === 'replies' && letterId) {
    showSection('replies-section');
    loadReplies(letterId);
  } else {
    showSection('welcome-section');
    initCreatorMode();
  }

  // 시작 버튼 클릭 이벤트 등록
  const startCreateBtn = document.getElementById('start-create-btn');
  if (startCreateBtn) {
    startCreateBtn.addEventListener('click', () => {
      showSection('create-section');
    });
  }
});

// 섹션 전환 함수
function showSection(sectionId) {
  const sections = ['welcome-section', 'create-section', 'success-section', 'replies-section'];
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (id === sectionId) {
        el.classList.remove('hidden');
      } else {
        el.classList.add('hidden');
      }
    }
  });
}

// 이미지 리사이즈 및 Base64 변환 함수 (Storage가 없을 때 Realtime DB 직접 저장을 위해 최적화)
function resizeImageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const max_size = 600; // 해상도를 600px로 축소하여 Realtime Database 용량 절약
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > max_size) {
            height *= max_size / width;
            width = max_size;
          }
        } else {
          if (height > max_size) {
            width *= max_size / height;
            height = max_size;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // JPEG 포맷, 0.6 퀄리티로 가볍게 압축하여 Base64로 추출
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
      img.src = e.target.result;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// ==========================================
// 1. 제작자 모드 (Firebase 전용 생성)
// ==========================================
function initCreatorMode() {
  const creatorForm = document.getElementById('creator-form');
  const fileDropzone = document.getElementById('file-dropzone');
  const fileInput = document.getElementById('file-input');
  const previewContainer = document.getElementById('preview-container');
  const createNewBtn = document.getElementById('create-new-btn');
  
  selectedFiles = []; // 초기화

  // 드롭존 클릭 -> 파일 선택 창 열기
  fileDropzone.addEventListener('click', () => fileInput.click());

  // 파일 선택 감지
  fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    fileInput.value = ''; // 동일 파일 재선택 가능하게 함
  });

  // 드래그 앤 드롭 이벤트
  ['dragenter', 'dragover'].forEach(eventName => {
    fileDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      fileDropzone.classList.add('dragover');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    fileDropzone.addEventListener(eventName, (e) => {
      e.preventDefault();
      fileDropzone.classList.remove('dragover');
    }, false);
  });

  fileDropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    handleFiles(dt.files);
  });

  // 파일 정밀 필터링 및 관리
  function handleFiles(files) {
    const limit = 5;
    
    if (selectedFiles.length + files.length > limit) {
      alert(`사진은 최대 ${limit}장까지만 업로드할 수 있습니다.`);
      return;
    }

    Array.from(files).forEach(file => {
      if (!file.type.startsWith('image/')) {
        alert(`${file.name}은(는) 이미지 파일이 아닙니다.`);
        return;
      }
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        alert(`${file.name}의 용량이 5MB를 초과합니다. 더 작은 크기의 이미지를 선택해 주세요.`);
        return;
      }

      selectedFiles.push(file);
      renderPreviews();
    });
  }

  // 업로드 파일 미리보기 렌더링
  function renderPreviews() {
    previewContainer.innerHTML = '';
    
    if (selectedFiles.length === 0) {
      previewContainer.style.display = 'none';
      return;
    }
    
    previewContainer.style.display = 'flex';

    selectedFiles.forEach((file, index) => {
      const previewWrapper = document.createElement('div');
      previewWrapper.className = 'preview-img-wrapper';

      const img = document.createElement('img');
      img.src = URL.createObjectURL(file);
      img.onload = () => URL.revokeObjectURL(img.src); // 메모리 방출
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'preview-remove-btn';
      removeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      removeBtn.type = 'button';
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        selectedFiles.splice(index, 1);
        renderPreviews();
      });

      previewWrapper.appendChild(img);
      previewWrapper.appendChild(removeBtn);
      previewContainer.appendChild(previewWrapper);
    });
  }

  // 편지 생성 폼 제출
  creatorForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // 파이어베이스 미연동 시 차단
    if (!db) {
      alert("⚠️ [설정 필요] 파이어베이스 연동 정보가 설정되어 있지 않습니다!\n'firebase-config.js' 파일에 본인의 파이어베이스 API 키 정보를 기입해 주세요.");
      return;
    }

    if (selectedFiles.length < 1) {
      alert("추억을 담을 사진을 최소 1장 이상 업로드해 주세요!");
      return;
    }

    const recipientName = document.getElementById('recipient-name').value.trim();
    const password = document.getElementById('letter-password').value.trim();
    const passwordHint = document.getElementById('password-hint-input').value.trim();
    const letterText = document.getElementById('letter-text-input').value;

    const loadingOverlay = document.getElementById('loading-overlay');
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');

    loadingOverlay.classList.remove('hidden');
    progressBar.style.width = '0%';
    progressText.innerText = '사진을 상자에 담는 중 (0%)...';

    // ==========================================
    // [실제 배포 모드] Firebase 클라우드 저장 진행
    // ==========================================
    try {
      // 1. Realtime Database 레퍼런스 먼저 획득하여 ID 선점
      const letterRef = db.ref("letters").push();
      const newLetterId = letterRef.key;

      // 2. 사진 리사이징 및 Base64 인코딩 진행 (Storage 업로드 생략)
      const photoUrls = [];
      
      for (let i = 0; i < selectedFiles.length; i++) {
        // 이미지를 압축된 Base64 문자열로 변환
        const base64Data = await resizeImageToBase64(selectedFiles[i]);
        photoUrls.push(base64Data);
        
        // 진행도 업데이트
        const progress = Math.round(((i + 1) / selectedFiles.length) * 100);
        progressBar.style.width = `${progress}%`;
        progressText.innerText = `사진 압축 및 변환 중... ${progress}% (${i + 1}/${selectedFiles.length}장)`;
      }

      progressBar.style.width = '100%';
      progressText.innerText = '데이터 저장 중...';

      // 3. Realtime Database에 최종 정보 데이터 쓰기 (Base64 이미지 스트링 포함)
      await letterRef.set({
        recipientName,
        password,
        passwordHint,
        letterText,
        photoUrls,
        createdAt: new Date().getTime()
      });

      // 4. 완료 후 공유 링크 셋업
      setupSuccessSection(newLetterId);
      
    } catch (error) {
      console.error("데이터 생성 중 실패:", error);
      alert("페이지 생성 중 오류가 발생했습니다. 다시 시도해 주세요:\n" + error.message);
    } finally {
      loadingOverlay.classList.add('hidden');
    }
  });

  // 새 편지 만들기 리셋
  createNewBtn.addEventListener('click', () => {
    creatorForm.reset();
    selectedFiles = [];
    previewContainer.innerHTML = '';
    previewContainer.style.display = 'none';
    showSection('create-section');
  });
}

// 생성 성공 화면 설정
function setupSuccessSection(id) {
  let currentOrigin = window.location.origin + window.location.pathname;
  
  // 로컬 파일(file://)로 접속했거나 로컬 테스트 서버인 경우, 깃허브 배포 주소로 강제 전환
  if (window.location.protocol === 'file:' || 
      window.location.hostname === 'localhost' || 
      window.location.hostname === '127.0.0.1') {
    currentOrigin = 'https://josebin75-commits.github.io/Birthday/index.html';
  }
  
  // index.html이 주소 끝에 포함되어 있다면 이를 letter.html로 변경, 없다면 letter.html을 덧붙임
  let letterPath = "";
  if (currentOrigin.endsWith('index.html')) {
    letterPath = currentOrigin.replace('index.html', 'letter.html');
  } else if (currentOrigin.endsWith('/')) {
    letterPath = currentOrigin + 'letter.html';
  } else {
    letterPath = currentOrigin + '/letter.html';
  }
  const letterUrl = `${letterPath}?id=${id}`;
  const replyUrl = currentOrigin.endsWith('index.html') 
    ? `${currentOrigin}?view=replies&id=${id}` 
    : `${currentOrigin.replace(/\/$/, '')}/index.html?view=replies&id=${id}`;

  const shareLetterInput = document.getElementById('share-letter-url');
  const shareReplyInput = document.getElementById('share-reply-url');

  shareLetterInput.value = letterUrl;
  shareReplyInput.value = replyUrl;

  bindCopyBtn('copy-letter-btn', letterUrl);
  bindCopyBtn('copy-reply-btn', replyUrl);

  showSection('success-section');
}

function bindCopyBtn(btnId, textToCopy) {
  const btn = document.getElementById(btnId);
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  newBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(textToCopy).then(() => {
      const originalText = newBtn.innerHTML;
      newBtn.innerHTML = '<i class="fa-solid fa-check"></i> 복사됨!';
      newBtn.style.backgroundColor = '#2a9d8f';
      
      setTimeout(() => {
        newBtn.innerHTML = originalText;
        newBtn.style.backgroundColor = '';
      }, 1500);
    }).catch(err => {
      console.error('클립보드 복사 실패:', err);
      const input = newBtn.previousElementSibling;
      input.select();
      document.execCommand('copy');
      alert('주소가 선택되었습니다. Ctrl+C를 눌러 복사하세요.');
    });
  });
}

// ==========================================
// 2. 답장 확인 모드 (Firebase 전용)
// ==========================================
async function loadReplies(id) {
  const repliesTitle = document.getElementById('replies-title');
  const repliesList = document.getElementById('replies-list');
  const goToViewerBtn = document.getElementById('go-to-viewer-btn');

  const currentOrigin = window.location.origin + window.location.pathname;
  let letterPath = "";
  if (currentOrigin.endsWith('index.html')) {
    letterPath = currentOrigin.replace('index.html', 'letter.html');
  } else if (currentOrigin.endsWith('/')) {
    letterPath = currentOrigin + 'letter.html';
  } else {
    letterPath = currentOrigin + '/letter.html';
  }
  goToViewerBtn.href = letterPath + `?id=${id}`;

  if (!db) {
    repliesList.innerHTML = '<div class="reply-error">파이어베이스가 연결되지 않았습니다. 설정 파일(firebase-config.js)을 기입해 주세요.</div>';
    return;
  }

  try {
    // 1. 편지 수신자 정보 가져오기
    const letterSnap = await db.ref("letters/" + id).once("value");

    if (letterSnap.exists()) {
      const letterData = letterSnap.val();
      repliesTitle.innerText = `${letterData.recipientName}님의 소중한 답장함 💌`;
    } else {
      repliesTitle.innerText = `생일 편지 답장함 💌`;
    }

    // 2. 해당 편지ID 하위의 답장들 가져오기
    const repliesSnap = await db.ref("replies/" + id).once("value");

    const replyDocs = [];
    if (repliesSnap.exists()) {
      repliesSnap.forEach(childSnap => {
        replyDocs.push({ id: childSnap.key, ...childSnap.val() });
      });
    }

    // 최신순 정렬
    replyDocs.sort((a, b) => b.createdAt - a.createdAt);

    renderReplies(replyDocs);

  } catch (error) {
    console.error("답장 조회 실패:", error);
    repliesList.innerHTML = `<div class="reply-error"><i class="fa-solid fa-triangle-exclamation"></i> 답장을 불러오는데 실패했습니다: ${error.message}</div>`;
  }
}

function renderReplies(replies) {
  const repliesList = document.getElementById('replies-list');
  repliesList.innerHTML = '';

  if (replies.length === 0) {
    repliesList.innerHTML = `
      <div class="empty-replies">
        <i class="fa-regular fa-comment-dots"></i>
        <p>아직 도착한 답장이 없습니다 😢</p>
        <p class="small-text">친구가 생일 축하 페이지를 다 읽고 하단에서 답장을 남기면 여기에 실시간으로 표시됩니다.</p>
      </div>
    `;
    return;
  }

  replies.forEach(reply => {
    const replyItem = document.createElement('div');
    replyItem.className = 'reply-item-card';

    const header = document.createElement('div');
    header.className = 'reply-item-header';

    const sender = document.createElement('span');
    sender.className = 'reply-sender';
    sender.innerHTML = `<i class="fa-solid fa-circle-user"></i> ${escapeHtml(reply.senderName)}`;

    const date = document.createElement('span');
    date.className = 'reply-date';
    date.innerText = formatDate(reply.createdAt);

    header.appendChild(sender);
    header.appendChild(date);

    const body = document.createElement('div');
    body.className = 'reply-body';
    body.innerText = reply.replyText;

    replyItem.appendChild(header);
    replyItem.appendChild(body);
    repliesList.appendChild(replyItem);
  });
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function escapeHtml(string) {
  return String(string).replace(/[&<>"']/g, function (s) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[s];
  });
}
