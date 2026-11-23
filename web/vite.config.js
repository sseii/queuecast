import { defineConfig } from "vite";

// GitHub Pages 주소가 https://아이디.github.io/저장소이름/ 이므로
// base 를 '/저장소이름/' 으로 맞춰야 한다. 저장소 이름을 바꾸면 여기도 바꿀 것.
export default defineConfig({
  base: "/queuecast/",
});
