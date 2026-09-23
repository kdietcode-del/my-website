const button = document.getElementById("hello-btn");
const output = document.getElementById("output");

const messages = [
  "잘 동작하네요!",
  "이 글자는 script.js 에서 나옵니다.",
  "파일을 고치고 저장한 뒤 새로고침 해보세요.",
  "GitHub에 올릴 준비가 됐습니다 🚀",
];

let count = 0;

button.addEventListener("click", () => {
  output.textContent = messages[count % messages.length];
  count += 1;
});
