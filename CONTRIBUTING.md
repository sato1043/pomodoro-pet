# Contributing Guidelines / コントリビューションガイドライン

Thank you for your interest in contributing to Pomodoro Pet.

> **Note on Japanese Translation / 日本語訳について**
>
> The Japanese translation provided below is for reference purposes only.
> In the event of any conflict or discrepancy between the English version and the Japanese translation, the English version shall prevail.
>
> 以下の日本語訳は参考目的でのみ提供される。
> 英語版と日本語訳の間に矛盾または相違がある場合、英語版が優先する。

---

## License / ライセンスについて

The source code of this project is licensed under **PolyForm Noncommercial License 1.0.0**. This is not an open source license; it is classified as "Source Available."

- Viewing, personal use, and modification of the source code are permitted
- Commercial use is prohibited
- See [LICENSE](LICENSE) for details

---

本プロジェクトのソースコードは **PolyForm Noncommercial License 1.0.0** でライセンスされている。これはオープンソースライセンスではなく「Source Available」に分類される。

- ソースコードの閲覧・個人利用・改変は許可される
- 商用利用は禁止される
- 詳細は [LICENSE](LICENSE) を参照

---

## Commercial Distribution / 商用配布について

This project plans to distribute the built application through stores as a **paid product**. Your contributions may be included in the commercial version. Please understand this before contributing.

---

本プロジェクトは、ビルド済みアプリをストアで **有料配布** する予定がある。あなたのコントリビューションは商用版にも含まれる可能性がある。この点を理解した上でコントリビューションを行ってほしい。

---

## CLA (Contributor License Agreement)

Before submitting a contribution, you must read and agree to the [Contributor License Agreement (CLA)](CLA.md).

Key points of the CLA:

- You **assign the copyright** of your contributions to the Project Owner
- The Project Owner **grants you back a non-exclusive license**, so you can continue to freely use your own contributions
- The copyright assignment enables the Project Owner to include contributions in both the noncommercial and commercial versions

### How to Agree / 同意方法

The pull request template includes a CLA agreement checkbox. Check the box when submitting your pull request to indicate your agreement. Pull requests without the checkbox checked will not be accepted.

---

コントリビューションを提出する前に、[CLA（コントリビューターライセンス契約）](CLA.md) の内容を確認し同意する必要がある。

CLAの要点:

- あなたの貢献物の **著作権をプロジェクト管理者に譲渡** する
- プロジェクト管理者はあなたに **非独占的ライセンスをバック** するため、あなた自身も自分の貢献物を引き続き自由に使用できる
- 著作権譲渡により、プロジェクト管理者は貢献物を非商用版と商用版の両方に含めることが可能になる

プルリクエストのテンプレートに CLA 同意チェックボックスがある。プルリクエスト提出時にチェックを入れることで同意を示す。チェックのないプルリクエストは受け入れられない。

---

## How to Contribute / コントリビューションの手順

### 1. Fork & Clone

```bash
# Fork the repository (via GitHub UI)
git clone https://github.com/<your-username>/pomodoro-pet.git
cd pomodoro-pet
npm install
```

### 2. Create a Branch / ブランチの作成

```bash
git checkout -b feature/your-feature-name
```

Branch from `main`. Use a descriptive branch name.

`main` ブランチから分岐する。ブランチ名は内容がわかるものにする。

### 3. Development / 開発

```bash
npm run dev          # Start dev server / 開発サーバー起動
npm test             # Run tests / テスト実行
npm run test:watch   # Test watch mode / テストウォッチモード
```

### 4. Verify Tests / テストの確認

```bash
npm run test:coverage   # All tests pass + coverage report / テスト全件通過 + カバレッジ確認
```

Ensure all existing tests pass. Add tests when introducing new features.

既存テストが通過することを確認する。新機能を追加した場合はテストも追加する。

### 5. Submit a Pull Request / プルリクエストの提出

- Create a pull request targeting the `main` branch
- Check the CLA agreement checkbox in the PR template
- Clearly describe your changes

---

## Coding Conventions / コーディング規約

Follow the project's architecture and conventions.

- **Clean Architecture**: Dependencies flow inward only (`domain <- application <- adapters <- infrastructure`)
- **TypeScript strict mode**: All interfaces must be explicitly defined
- **Pure domain layer**: No dependency on Three.js or DOM
- **Testing**: Write tests for the domain and application layers

See the Architecture section in [.claude/CLAUDE.md](.claude/CLAUDE.md) for details.

---

プロジェクトのアーキテクチャと規約に従うこと。

- **クリーンアーキテクチャ**: 依存方向は外→内のみ（`domain ← application ← adapters ← infrastructure`）
- **TypeScript strict mode**: すべてのインターフェースを明示的に定義
- **ドメイン層は純粋**: Three.js やDOM への依存を持たない
- **テスト**: ドメイン層とアプリケーション層にはテストを書く

---

## Purchased Assets / 購入素材について

This project uses some purchased assets (FBX models, BGM, sound effects, etc.). These are not included in the repository. If your changes involve assets, please discuss in an Issue beforehand.

---

本プロジェクトは一部に購入素材（FBXモデル、BGM、効果音等）を使用している。これらはリポジトリに含まれない。素材に関わる変更を行う場合は事前に Issue で相談してほしい。
