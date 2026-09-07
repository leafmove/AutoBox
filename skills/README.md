# Skills

AutoBox 技能文件夹。

用于存放技能定义文件（SKILL.md）及相关资源，每个技能独立子目录。

## 结构规范

```
skills/
├── README.md
├── <skill-name>/
│   ├── SKILL.md          # 技能定义文件
│   └── ...               # 其他资源文件
└── ...
```

## 技能注册

技能安装后需在 `skills/` 目录下创建对应子目录，并确保 `SKILL.md` 符合技能定义规范。