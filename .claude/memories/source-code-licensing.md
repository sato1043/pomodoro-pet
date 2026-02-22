# ソースコードライセンスの選定

## 概要

本プロジェクトのソースコードには **PolyForm Noncommercial License 1.0.0** を採用した。
これはオープンソースライセンスではなく、「Source Available（ソースアベイラブル）」と呼ばれるカテゴリに属する。
ソースコードの閲覧・個人利用・改変は許可されるが、商用利用は禁止される。

- `LICENSE` ファイル: リポジトリルートに全文を配置
- `package.json`: `"license": "SEE LICENSE IN LICENSE"`
- ライセンス原文URL: https://polyformproject.org/licenses/noncommercial/1.0.0/

> **注意: 本文書は法的助言ではない。具体的な判断は弁護士に確認すること。**

---

## 1. 選定の背景と要件

### 背景

- ソースコードをGitHubで公開したい（スキルアピールが目的）
- ビルド済みアプリをストアで有料配布する予定がある
- 購入素材（FBX、BGM、効果音等）はリポジトリに含めない（[asset-licensing-distribution.md](asset-licensing-distribution.md) 参照）

### 要件

| 条件 | 可否 |
|---|---|
| ソースコード閲覧 | ○ 許可する |
| 個人使用目的のビルド | ○ 許可する |
| パッチ送付（コントリビューション） | ○ 歓迎する |
| 商用利用 | × 許容できない |
| ソースコード・ビルド成果物の再配布 | × 許容できない |

---

## 2. 検討した選択肢

### オープンソースライセンス（不採用）

| ライセンス | 不採用理由 |
|---|---|
| MIT / ISC / BSD | 商用利用・再配布を制限できない |
| Apache-2.0 | 同上。特許条項は有用だが商用制限なし |
| GPL-3.0 | コピーレフトだが商用利用自体は明示的に許可している |
| AGPL-3.0 | 同上 |

OSI定義のオープンソースライセンスはすべて商用利用を許可する（OSD第6条「利用分野に対する差別の禁止」）。
本プロジェクトの要件を満たすオープンソースライセンスは存在しない。

### Source Availableライセンス（検討対象）

| ライセンス | 評価 |
|---|---|
| **PolyForm Noncommercial 1.0.0** | **採用**。要件の大部分を満たす。非商用再配布のみ要件と若干ずれるが実害は限定的 |
| PolyForm Strict 1.0.0 | 改変を禁止するためパッチ送付と矛盾する |
| BSL 1.1 (Business Source License) | 一定期間後にオープンソースへ転換する仕組み。転換の意図がないなら不適合 |
| Commons Clause + MIT | 「販売」のみ禁止。再配布は禁止できない |
| カスタムライセンス | 全要件を満たせるが法的精度に弁護士確認が必要。個人プロジェクト段階では費用対効果が低い |

### その他

| 選択肢 | 評価 |
|---|---|
| `UNLICENSED` | ソース公開しても利用権を一切付与しない。パッチ送付の法的根拠が不明確になる |
| CC BY-NC 4.0 | ソフトウェアには推奨されていない（Creative Commons自身が明言） |

---

## 3. Source Availableとは

「Source Available」はソースコードが公開されているが、利用に制限があるライセンスのカテゴリである。

| | オープンソース (OSI定義) | Source Available |
|---|---|---|
| ソースコード公開 | はい | はい |
| 商用利用 | 無制限 | 制限あり |
| 再配布 | 無制限 | 制限あり |
| OSD準拠 | はい | いいえ |
| 「オープンソース」を名乗れるか | はい | いいえ |

GitHubでソースコードを公開しても、「オープンソースプロジェクト」とは名乗れない点に注意する。

---

## 4. PolyForm Projectについて

### 概要

ソフトウェア向けの「ソース公開型・権利制限付きライセンス」を標準化するプロジェクトである。

- 創設者: Kyle E. Mitchell氏（オークランド在住の技術系弁護士・プログラマ）
- 共同起草者: Heather Meeker氏（著名なオープンソースライセンス弁護士）
- 起草チームの合計実務経験: 100年以上

### 設立の動機

Creative Commonsが芸術分野（CC BY-NC等）のライセンスを標準化したのと同様に、ソフトウェア分野の「非商用」「試用」「社内限定」等の中間的な権利制限ライセンスを標準化する目的で設立された。

Commons Clause、Elastic License、Confluent License等、各社が独自ライセンスを乱立した結果の混乱を解消する狙いがある。

### 前身

Mitchell氏の先行プロジェクト「Prosperity License」（Creative Commonsの文言を元にしたソフトウェア非商用ライセンス）への想定外の需要がPolyForm立ち上げの動機となった。

参考:
- https://polyformproject.org/what-is-polyform/
- https://writing.kemitchell.com/2019/05/30/Polyform

---

## 5. PolyForm Noncommercial 1.0.0 — 各セクション解説

ライセンス全文は約800語で、意図的に平易な英語で書かれている。

### 5.1 Acceptance（受諾）

> In order to get any license under these terms, you must agree to them as both strict obligations and conditions to all your licenses.

この条項に基づくライセンスを取得するには、これらの条項を厳格な義務かつライセンスの条件として同意する必要がある。

### 5.2 Copyright License（著作権ライセンス）

> The licensor grants you a copyright license for the software to do everything you might do with the software that would otherwise infringe the licensor's copyright in it for any permitted purpose. However, you may only distribute the software according to Distribution License and make changes or new works based on the software according to Changes and New Works License.

ライセンサーは、許可された目的（permitted purpose）に限り、ソフトウェアに対してライセンサーの著作権を侵害するすべての行為を行う著作権ライセンスを付与する。ただし配布はDistribution License、変更・派生物の作成はChanges and New Works Licenseに従う必要がある。

### 5.3 Distribution License（配布ライセンス）

> The licensor grants you an additional copyright license to distribute copies of the software. Your license to distribute covers distributing the software with changes and new works permitted by Changes and New Works License.

ライセンサーはソフトウェアのコピーを配布する追加の著作権ライセンスを付与する。Changes and New Works Licenseで許可された変更・派生物を含むソフトウェアの配布もカバーされる。

**本プロジェクトへの影響**: 非商用目的であれば第三者がソースコードを再配布できることを意味する。ただし購入素材がリポジトリに含まれないため、ソースコードだけ再配布されても完全なアプリにはならない。

### 5.4 Notices（通知）

> You must ensure that anyone who gets a copy of any part of the software from you also gets a copy of these terms or the URL for them above, as well as copies of any plain-text lines beginning with `Required Notice:` that the licensor provided with the software.

ソフトウェアのコピーを受け取る者にライセンス条項のコピー（またはURL）および `Required Notice:` で始まるテキスト行を提供する義務がある。

本プロジェクトのLICENSEファイルには以下を記載している:

```
Required Notice: Copyright 2026 sato1043@updater.cc
```

### 5.5 Changes and New Works License（変更・派生物ライセンス）

> The licensor grants you an additional copyright license to make changes and new works based on the software for any permitted purpose.

許可された目的に限り、ソフトウェアを変更し、派生物を作成する権利を付与する。

**本プロジェクトへの影響**: パッチ送付（コントリビューション）はこの条項で許可される。

### 5.6 Patent License（特許ライセンス）

> The licensor grants you a patent license for the software that covers patent claims the licensor can license, or becomes able to license, that you would infringe by using the software.

ライセンサーが許諾可能な（または将来許諾可能になる）特許請求項について、ソフトウェアの使用に必要な範囲で特許ライセンスを付与する。

**解説**: ソフトウェアの使用が特許を侵害する場合に備えた条項である。個人プロジェクトで特許を取得していない場合は実質的に影響はないが、ライセンス文面として含まれている。

### 5.7 Noncommercial Purposes（非商用目的）

> Any noncommercial purpose is a permitted purpose.

いかなる非商用目的も許可された目的である。

**解説**: 「非商用（noncommercial）」自体の正面からの定義はなく、後続のPersonal UsesとNoncommercial Organizationsで具体的なセーフハーバーを定める構造になっている。詳細は「6. 非商用の定義」セクション参照。

### 5.8 Personal Uses（個人利用）

> Personal use for research, experiment, and testing for the benefit of public knowledge, personal study, private entertainment, hobby projects, amateur pursuits, or religious observance, without any anticipated commercial application, is use for a permitted purpose.

以下の個人利用は許可された目的である:

- 公知のための研究・実験・テスト
- 個人学習
- 私的娯楽
- 趣味プロジェクト
- アマチュア活動
- 宗教的遵守

条件: **「商用応用の予定がないこと（without any anticipated commercial application）」**

### 5.9 Noncommercial Organizations（非商用組織）

> Use by any charitable organization, educational institution, public research organization, public safety or health organization, environmental protection organization, or government institution is use for a permitted purpose regardless of the source of funding or obligations resulting from the funding.

以下の組織による利用は、**資金源や資金に伴う義務に関係なく**許可される:

- 慈善団体
- 教育機関
- 公的研究機関
- 公共安全・健康組織
- 環境保護団体
- 政府機関

**注目点**: 「regardless of the source of funding or obligations resulting from the funding」により、企業からの寄付金で運営される大学や、政府委託研究に企業が関与する場合でも、上記の組織カテゴリに該当すれば利用は許可される。

### 5.10 Fair Use（フェアユース）

> You may have "fair use" rights for the software under the law. These terms do not limit them.

法律上のフェアユース権を制限しない。

### 5.11 No Other Rights（他の権利なし）

> These terms do not allow you to sublicense or transfer any of your licenses to anyone else, or prevent the licensor from granting licenses to anyone else. These terms do not imply any other licenses.

- サブライセンスや権利譲渡は不可
- ライセンサーが他者にライセンスを付与することを妨げない
- 明示されていない権利は暗示されない

**解説**: サブライセンス禁止により、エンドユーザーは常に原著作者から直接ライセンスを受ける構造になる。

### 5.12 Patent Defense（特許防御）

> If you make any written claim that the software infringes or contributes to infringement of any patent, your patent license for the software granted under these terms ends immediately. If your company makes such a claim, your patent license ends immediately for work on behalf of your company.

ソフトウェアが特許を侵害すると書面で主張した場合、特許ライセンスが即時終了する。会社の従業員が主張した場合は、会社のための作業に関する特許ライセンスが即時終了する。

**解説**: いわゆる「特許報復条項」である。特許訴訟による攻撃を抑止する目的がある。

### 5.13 Violations（違反）

> The first time you are notified in writing that you have violated any of these terms, or done anything with the software not covered by your licenses, your licenses can nonetheless continue if you come into full compliance with these terms, and take practical steps to correct past violations, within 32 days of receiving notice. Otherwise, all your licenses end immediately.

初回の違反は書面通知後 **32日以内** に完全遵守と過去の違反の是正を行えばライセンスは継続する。それ以外の場合はすべてのライセンスが即時終了する。

**解説**: いわゆる「治癒期間（cure period）」である。意図しない違反に対する猶予を与える仕組みになっている。

### 5.14 No Liability（免責）

> ***As far as the law allows, the software comes as is, without any warranty or condition, and the licensor will not be liable to you for any damages arising out of these terms or the use or nature of the software, under any kind of legal claim.***

法律が許す限り、ソフトウェアは現状有姿（as is）で提供される。一切の保証なし。ライセンサーはいかなる損害についても責任を負わない。

### 5.15 Definitions（定義）

> The **licensor** is the individual or entity offering these terms, and the **software** is the software the licensor makes available under these terms.

- **licensor（ライセンサー）**: この条項を提示する個人または団体
- **software（ソフトウェア）**: この条項の下でライセンサーが利用可能にするソフトウェア

> **You** refers to the individual or entity agreeing to these terms.

- **You（あなた）**: この条項に同意する個人または団体

> **Your company** is any legal entity, sole proprietorship, or other kind of organization that you work for, plus all organizations that have control over, are under the control of, or are under common control with that organization. **Control** means ownership of substantially all the assets of an entity, or the power to direct its management and policies by vote, contract, or otherwise. Control can be direct or indirect.

- **Your company（あなたの会社）**: あなたが勤務する法人・個人事業・その他の組織、およびその組織を支配する・支配下にある・共同支配下にある全組織
- **Control（支配）**: 実質的にすべての資産を所有するか、議決権・契約等により経営・方針を指示する権限。直接的・間接的を問わない

> **Your licenses** are all the licenses granted to you for the software under these terms.

- **Your licenses（あなたのライセンス）**: この条項に基づきあなたに付与されたソフトウェアのすべてのライセンス

> **Use** means anything you do with the software requiring one of your licenses.

- **Use（使用）**: ライセンスを必要とするソフトウェアに対するすべての行為

---

## 6. 「非商用」の定義 — 詳細

### 3層構造

PolyForm Noncommercial 1.0.0は「非商用」を3層構造で定義している。

| 層 | 対象 | 範囲 |
|---|---|---|
| 第1層 | 原則 | 「いかなる非商用目的も許可」（包括的宣言） |
| 第2層 | 個人利用 | 研究・学習・娯楽・趣味等（セーフハーバー） |
| 第3層 | 非商用組織 | 教育機関・慈善団体・政府機関等（セーフハーバー） |

### セーフハーバーの意味

セーフハーバーは「これに該当すれば確実に許可される」という安全地帯を定めるものである。セーフハーバーに該当しない利用が自動的に禁止されるわけではなく、第1層の原則（「非商用目的であれば許可」）に立ち返って判断される。

### グレーゾーン

「商用（commercial）」の正面からの定義がないため、以下のケースは判断が分かれる:

- 営利企業に勤務する研究者が業務時間中に研究目的で使用する場合
- 非営利団体が商業的な受託業務の一部としてソフトウェアを使用する場合
- フリーランスの個人開発者が収入を得る活動に使用する場合
- 広告収入のあるブログのツールとしてソフトウェアを使用する場合

この曖昧さはCreative Commons NCライセンスと共通の根本的課題である。

---

## 7. PolyFormライセンスファミリー比較

PolyForm Projectは7種類のライセンスを提供している。

| ライセンス | 利用 | 変更 | 配布 | 制限の性質 |
|---|---|---|---|---|
| **Noncommercial** | 非商用のみ | 可 | 可 | 商用利用を全面的に禁止 |
| Strict | 非商用のみ | 不可 | 不可 | 最も厳格。閲覧のみ許可 |
| Internal Use | 社内のみ | 可 | 不可 | 外部配布を禁止 |
| Free Trial | 32日間 | 可 | 可 | 時間制限 |
| Small Business | 小規模のみ | 可 | 可 | 従業員100人以下・年間売上100万ドル以下 |
| Perimeter | 競合ソフト以外 | 可 | 可 | ソフトウェア自体と競合する利用を禁止 |
| Shield | 競合事業以外 | 可 | 可 | ライセンサーの事業と競合する利用を禁止 |

### デュアルライセンス戦略

Mitchell氏はNoncommercialとFree Trialの併用を推奨している。

- 非商用利用者: Noncommercialで無期限に利用
- 商用利用者: Free Trialで32日間の無料試用後、商用ライセンスを交渉

---

## 8. 採用実績

| プロジェクト | 概要 | 経緯 |
|---|---|---|
| EPPlus | .NET向けExcel操作ライブラリ | v5(2020年)でLGPLからPolyForm Noncommercialに変更。商用は有料ライセンス |
| VAMP (KavrakiLab) | ロボット工学モーションプランニングライブラリ | PolyForm Noncommercialで公開。「非商用」の定義の曖昧さについてIssue #13で議論が発生 |
| Enable Data Union | 教育データ連携ツール | 教育機関・非営利・政府機関の利用を想定して選定 |

採用パターンの傾向:
- デュアルライセンス戦略（非商用は無料、商用は有料）の非商用側として使われることが多い
- 教育・研究機関向けソフトウェアの公開に適している

---

## 9. 注意点・批判

### オープンソースではない

PolyForm Project自身が認めている。OSI定義のオープンソースではなく「Source Available」である。「オープンソースプロジェクト」と名乗ることはできない。

### 「非商用」の境界が曖昧

CC BY-NCと同じ根本的課題を持つ。KavrakiLab/vampのIssue #13では、商用組織内の学術研究者がこのライセンスのソフトウェアを使えるのか不明確だという議論が発生した。

### OSSエコシステムとの互換性がない

- OSSプロジェクトの依存関係として組み込めない
- npmで配布された場合、利用者がライセンス制限に気づかない可能性がある

### サブライセンス・譲渡の禁止

エンドユーザーは常に原著作者から直接ライセンスを受ける必要がある。再配布チェーンにおいて権利関係が複雑になりうる。

### v2.0.0ドラフトが進行中

2025年11月にv2.0.0のプレリリースドラフト（pre.1, pre.2）が公開されている。550語以下への短縮、治癒期間の32日→30日変更等の修正がある。将来的なバージョンアップの可能性を認識しておく。

---

## 10. 本プロジェクトへの適用

### ファイル構成

| ファイル | 内容 |
|---|---|
| `LICENSE` | PolyForm Noncommercial 1.0.0 全文 + `Required Notice: Copyright 2026 sato1043@updater.cc` |
| `package.json` | `"license": "SEE LICENSE IN LICENSE"` |

### 要件の充足状況

| 要件 | 充足 | 備考 |
|---|---|---|
| ソースコード閲覧 | ○ | Copyright Licenseで許可 |
| 個人使用目的のビルド | ○ | Personal Usesセーフハーバーに該当 |
| パッチ送付 | ○ | Changes and New Works Licenseで許可 |
| 商用利用の禁止 | ○ | Noncommercial Purposesで禁止 |
| 再配布の禁止 | △ | 非商用再配布は許可される |

### 再配布に関する補足

非商用目的の再配布はライセンス上許可される。しかし購入素材がリポジトリに含まれないため、ソースコードだけ再配布されても完全なアプリにはならない。実害は限定的と判断した。収益が実際に脅かされる段階になった場合はカスタムライセンスへの移行を検討する。

---

## 11. 今後の検討事項

### CLA（Contributor License Agreement）— 策定済み

**著作権譲渡型（Copyright Assignment）** のCLAを策定し、[CLA.md](../../CLA.md) として配置した。

#### 採用した類型と理由

CLAには主に2つの類型がある:

| 類型 | 概要 | 代表例 |
|---|---|---|
| **著作権譲渡型（Copyright Assignment）** | 貢献物の著作権をプロジェクト管理者に完全譲渡する | FSF, Canonical |
| ライセンス付与型（License Grant） | 著作権は保持したまま広範なライセンスを付与する | Apache CLA, Google CLA |

本プロジェクトでは **著作権譲渡型** を採用した。理由は以下の通り:

1. **商用配布の法的根拠の明確化**: PolyForm Noncommercialでソースを公開しつつ有料配布する構造では、コントリビューションの著作権がプロジェクト管理者に帰属していないと商用ライセンスを付与する権限が不明確になる
2. **権利関係の単純化**: ライセンス付与型では複数のコントリビューターが個別に著作権を保持する共有著作権状態になり、将来のライセンス変更や法的対応が複雑になる
3. **ライセンスバックによるコントリビューターの権利保護**: 著作権譲渡と同時に非独占的・取消不能なライセンスをコントリビューターに付与するため、コントリビューター自身の利用は制限されない

#### 関連ファイル

| ファイル | 内容 |
|---|---|
| [CLA.md](../../CLA.md) | CLA本文（英語 + 日本語参考訳） |
| [CONTRIBUTING.md](../../CONTRIBUTING.md) | コントリビューションガイドライン（CLA署名要件を含む） |
| [.github/PULL_REQUEST_TEMPLATE.md](../../.github/PULL_REQUEST_TEMPLATE.md) | PRテンプレート（CLA同意チェックボックス） |

#### 同意の取得方法

プルリクエスト提出時にPRテンプレートのCLA同意チェックボックスにチェックを入れる方式を採用した。CLA botによる自動化は導入していない。

### 素材ライセンスとの関係

ソースコードのライセンス（PolyForm Noncommercial）と購入素材のライセンスは独立した話である。素材のライセンスについては [asset-licensing-distribution.md](asset-licensing-distribution.md) を参照。

### ストア配布時のライセンス表記

| 項目 | 状態 | 備考 |
|---|---|---|
| `THIRD_PARTY_LICENSES` への依存パッケージのライセンス記載 | 完了 | `npm run licenses`で自動生成。`licenses/`ディレクトリに配置。`extraResources`でバイナリ同梱 |
| アプリ内About画面でのライセンス表記 | 未着手 | TODO.md「About画面の作成」に記載 |
| EULA（End User License Agreement）の策定 | 未着手 | TODO.md「EULA策定」に記載 |

---

## 参考資料

- PolyForm Project: https://polyformproject.org/
- PolyForm Noncommercial 1.0.0 全文: https://polyformproject.org/licenses/noncommercial/1.0.0/
- PolyForm Project - What is PolyForm?: https://polyformproject.org/what-is-polyform/
- Kyle Mitchell - PolyForm: https://writing.kemitchell.com/2019/05/30/Polyform
- PolyForm Noncommercial 2.0.0-pre.1: https://writing.kemitchell.com/2025/11/04/PolyForm-Noncommercial-2.0.0-pre.1
- Kyle Mitchell - MIT for Noncommercial is Broken: https://writing.kemitchell.com/2022/01/21/MIT-for-Noncommercial
- EPPlus LGPL to PolyForm: https://www.epplussoftware.com/en/Home/LgplToPolyform
- SPDX - PolyForm-Noncommercial-1.0.0: https://spdx.org/licenses/PolyForm-Noncommercial-1.0.0.html
