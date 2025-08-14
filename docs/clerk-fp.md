# Fingerprint + Clerk 集成使用指南

## 快速开始

### 1. 安装依赖
```bash
npm install @windrun-huaiin/third-ui
```

### 2. 创建配置文件
```typescript
// lib/fingerprint.config.ts
import { FingerprintConfig } from '@windrun-huaiin/third-ui/fingerprint';

export const fingerprintConfig: FingerprintConfig = {
  apiEndpoint: '/api/user/anonymous/init',
  autoInitialize: true,
  initialCredits: 50,
};
```

### 3. 实现 API 路由
```typescript
// app/api/user/anonymous/init/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { extractFingerprintFromNextRequest } from '@windrun-huaiin/third-ui/fingerprint/server';

export async function POST(request: NextRequest) {
  const fingerprintId = extractFingerprintFromNextRequest(request);
  
  // 实现你的业务逻辑
  const user = await createOrFindUser(fingerprintId);
  const credits = await initializeCredits(user.id);
  
  return NextResponse.json({ success: true, user, credits });
}
```

### 4. 设置 Provider
```tsx
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';
import { FingerprintProvider } from '@windrun-huaiin/third-ui/fingerprint';
import { fingerprintConfig } from '@/lib/fingerprint.config';

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <FingerprintProvider config={fingerprintConfig}>
        {children}
      </FingerprintProvider>
    </ClerkProvider>
  );
}
```

### 5. 使用组件
```tsx
// app/sign-up/page.tsx
import { SignUpWithFingerprint } from '@windrun-huaiin/third-ui/clerk';

export default function SignUpPage() {
  return <SignUpWithFingerprint />;
}
```

## 高级用法

### 自定义组合
```tsx
import { useFingerprintContext } from '@windrun-huaiin/third-ui/fingerprint';
import { SignUp } from '@clerk/nextjs';

function CustomSignUp() {
  const { fingerprintId, anonymousUser } = useFingerprintContext();
  
  const unsafeMetadata = {
    user_id: anonymousUser?.userId || null,
    fingerprint_id: fingerprintId || null,
  };
  
  return <SignUp unsafeMetadata={unsafeMetadata} />;
}
```

### 服务端提取指纹
```typescript
import { extractFingerprintId } from '@windrun-huaiin/third-ui/fingerprint/server';

// 在 API 路由中
const fingerprintId = extractFingerprintId(
  request.headers,
  cookies,
  query
);
```

### 创建指纹请求
```typescript
import { createFingerprintFetch } from '@windrun-huaiin/third-ui/fingerprint';

const fpFetch = createFingerprintFetch();
const response = await fpFetch('/api/data');
```

## 导出入口

- **客户端**: `@windrun-huaiin/third-ui/fingerprint`
- **服务端**: `@windrun-huaiin/third-ui/fingerprint/server`
- **Clerk 客户端**: `@windrun-huaiin/third-ui/clerk`
- **Clerk 服务端**: `@windrun-huaiin/third-ui/clerk/server`

## 核心概念

1. **原子化设计**: Fingerprint 和 Clerk 功能完全独立
2. **环境分离**: 客户端和服务端代码严格分离
3. **配置驱动**: 通过配置适配不同项目需求
4. **渐进增强**: 可以单独使用任一功能