
## 이력서 양식 PDF 다시 만들기

`scripts/이력서양식.html` 을 고친 뒤:

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
  --no-pdf-header-footer --print-to-pdf=/tmp/out.pdf scripts/이력서양식.html
cp /tmp/out.pdf "public/files/뷰티워크-이력서-양식.pdf"
```
