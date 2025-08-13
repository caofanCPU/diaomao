
### Clerk事件监听回调配置
* 端点url，即本项目提供的供外部调用的API：/api/webhook/clerk/user


### User Events

* UserCreated数据结构

```json
{
  "data": {
    "email_addresses": ["xxx@gmail.com", "yyy@gmail.com"],
    "unsafe_metadata": {
      "user_id": "本系统的用户ID",
      "fingerprint_id": "浏览器指纹ID"
    }
    "id": "user_2g7np7Hrk0SN6kj5EDMLDaKNL0S"
  },
  "event_attributes": {
    "http_request": {
      "client_ip": "192.168.1.100",
      "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    }
  },
  "instance_id": "ins_2g7np7Hrk0SN6kj5EDMLDaKNL0S",
  "object": "event",
  "timestamp": 1716883200,
  "type": "user.created"
}
```

* UserDeleted数据结构

```json
{
  "data": {
    "deleted": true,
    "id": "user_29wBMCtzATuFJut8jO2VNTVekS4",
    "object": "user"
  },
  "event_attributes": {
    "http_request": {
      "client_ip": "0.0.0.0",
      "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
    }
  },
  "object": "event",
  "timestamp": 1661861640000,
  "type": "user.deleted"
}
```