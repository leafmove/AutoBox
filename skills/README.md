# Skills

AutoBox 技能文件夹，每个技能独立子目录。

## 当前技能

| 技能 | 说明 |
|:---|:---|
| [box-flow](./box-flow/) | Box流程管理CLI工具，支持搜索/运行/查询Box流程 |
| [leafmove-app](./leafmove-app/) | 叶动独立应用编写技能，快速构建GUI/Web全栈应用 |
| [ssh-remote](./ssh-remote/) | SSH 远程服务器操作技能，基于 paramiko 的安全远程连接 |

## 结构规范

```
skills/
├── README.md
├── <skill-name>/
│   ├── SKILL.md          # 技能定义文件
│   ├── assets/           # 资源文件（CSS/JS模板等）
│   ├── references/       # 参考文档
│   ├── scripts/          # 辅助脚本
│   └── ...
└── ...
```