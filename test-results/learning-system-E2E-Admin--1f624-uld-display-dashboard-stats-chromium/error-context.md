# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - banner [ref=e2]:
    - generic [ref=e3]:
      - link "学习管理系统" [ref=e5] [cursor=pointer]:
        - /url: /
        - img [ref=e7]
        - generic [ref=e9]: 学习管理系统
      - navigation [ref=e10]:
        - link "我的学习" [ref=e11] [cursor=pointer]:
          - /url: /
        - link "课程目录" [ref=e12] [cursor=pointer]:
          - /url: /courses
        - link "证书" [ref=e13] [cursor=pointer]:
          - /url: /certificates
      - link "登录" [ref=e15] [cursor=pointer]:
        - /url: /auth/login
        - button "登录" [ref=e16]:
          - img [ref=e17]
          - text: 登录
  - main [ref=e20]:
    - generic [ref=e22]:
      - heading "404" [level=1] [ref=e23]
      - heading "This page could not be found." [level=2] [ref=e25]
  - alert [ref=e26]
```