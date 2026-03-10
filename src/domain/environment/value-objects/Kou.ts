/** 候の位相（初候・次候・末候） */
export type KouPhase = 'initial' | 'middle' | 'final'

/** 七十二候の定義 */
export interface KouDefinition {
  readonly index: number             // 0-71（小寒初候=0, ..., 冬至末候=71）
  readonly solarTermName: string     // 親の節気名（漢字）
  readonly solarTermNameEn: string   // 親の節気名（英語）
  readonly phase: KouPhase
  readonly eclipticLonStart: number  // 開始黄経 (度)。(index*5 + 285) % 360
  readonly phaseNameEn: string         // 候の位相名（英語: 1st/2nd/3rd）
  readonly phaseNameJa: string         // 候の位相名（和名: 初候/次候/末候）
  readonly nameJa: string            // 候名（例: 「東風解凍」）
  readonly nameEn: string            // 英語名
  readonly readingJa: string         // 読み仮名
  readonly description: string       // 説明文
}

// [phase, 英語ラベル, 和名ラベル]
const PHASES: readonly [KouPhase, string, string][] = [
  ['initial', '1st', '初候'],
  ['middle', '2nd', '次候'],
  ['final', '3rd', '末候'],
]

// [和名, 英語名]
const SOLAR_TERMS: readonly [string, string][] = [
  ['小寒', 'Minor Cold'], ['大寒', 'Major Cold'], ['立春', 'Start of Spring'],
  ['雨水', 'Rain Water'], ['啓蟄', 'Awakening of Insects'], ['春分', 'Vernal Equinox'],
  ['清明', 'Clear and Bright'], ['穀雨', 'Grain Rain'], ['立夏', 'Start of Summer'],
  ['小満', 'Grain Buds'], ['芒種', 'Grain in Ear'], ['夏至', 'Summer Solstice'],
  ['小暑', 'Minor Heat'], ['大暑', 'Major Heat'], ['立秋', 'Start of Autumn'],
  ['処暑', 'End of Heat'], ['白露', 'White Dew'], ['秋分', 'Autumnal Equinox'],
  ['寒露', 'Cold Dew'], ['霜降', "Frost's Descent"], ['立冬', 'Start of Winter'],
  ['小雪', 'Minor Snow'], ['大雪', 'Major Snow'], ['冬至', 'Winter Solstice'],
]

// 略本暦（明治7年/1874年改訂）準拠
const KOU_DATA: readonly [string, string, string, string][] = [
  // [候名, 読み仮名, 英語名, 説明文]
  ['芹乃栄', 'せりすなわちさかう', 'Parsley flourishes', '芹が盛んに生い茂る'],
  ['水泉動', 'しみずあたたかをふくむ', 'Springs thaw', '地中の泉が動き始める'],
  ['雉始雊', 'きじはじめてなく', 'Pheasants start to call', '雄の雉が鳴き始める'],
  ['款冬華', 'ふきのはなさく', 'Butterbur sprouts', '蕗の薹が蕾を出す'],
  ['水沢腹堅', 'さわみずこおりつめる', 'Ice thickens on streams', '沢の水が厚く凍る'],
  ['鶏始乳', 'にわとりはじめてとやにつく', 'Hens begin to lay', '鶏が卵を産み始める'],
  ['東風解凍', 'はるかぜこおりをとく', 'East wind thaws ice', '春の風が氷を解かし始める'],
  ['黄鶯睍睆', 'うぐいすなく', 'Bush warblers sing', '鶯が山里で鳴き始める'],
  ['魚上氷', 'うおこおりをいずる', 'Fish emerge from ice', '割れた氷の間から魚が飛び出す'],
  ['土脉潤起', 'つちのしょううるおいおこる', 'Rain moistens the soil', '雨が降って土が湿り気を含む'],
  ['霞始靆', 'かすみはじめてたなびく', 'Mist begins to linger', '霞がたなびき始める'],
  ['草木萌動', 'そうもくめばえいずる', 'Grass sprouts, trees bud', '草木が芽吹き始める'],
  ['蟄虫啓戸', 'すごもりむしとをひらく', 'Hibernating insects emerge', '冬ごもりの虫が出てくる'],
  ['桃始笑', 'ももはじめてさく', 'First peach blossoms', '桃の花が咲き始める'],
  ['菜虫化蝶', 'なむしちょうとなる', 'Caterpillars become butterflies', '青虫が羽化して蝶になる'],
  ['雀始巣', 'すずめはじめてすくう', 'Sparrows start to nest', '雀が巣を作り始める'],
  ['桜始開', 'さくらはじめてひらく', 'First cherry blossoms', '桜の花が咲き始める'],
  ['雷乃発声', 'かみなりすなわちこえをはっす', 'Distant thunder', '遠くで雷の音がし始める'],
  ['玄鳥至', 'つばめきたる', 'Swallows return', '燕が南からやってくる'],
  ['鴻雁北', 'こうがんかえる', 'Wild geese fly north', '雁が北へ渡っていく'],
  ['虹始見', 'にじはじめてあらわる', 'First rainbows', '雨の後に虹が出始める'],
  ['葭始生', 'あしはじめてしょうず', 'First reeds sprout', '葦が芽を吹き始める'],
  ['霜止出苗', 'しもやんでなえいづる', 'Last frost, rice seedlings', '霜が止み苗が育ち始める'],
  ['牡丹華', 'ぼたんはなさく', 'Peonies bloom', '牡丹の花が咲く'],
  ['蛙始鳴', 'かわずはじめてなく', 'Frogs start singing', '蛙が鳴き始める'],
  ['蚯蚓出', 'みみずいづる', 'Worms surface', '蚯蚓が地上に出てくる'],
  ['竹笋生', 'たけのこしょうず', 'Bamboo shoots sprout', '筍が生えてくる'],
  ['蚕起食桑', 'かいこおきてくわをはむ', 'Silkworms feast on mulberry', '蚕が桑を盛んに食べ始める'],
  ['紅花栄', 'べにばなさかう', 'Safflowers bloom', '紅花が盛んに咲く'],
  ['麦秋至', 'むぎのときいたる', 'Wheat ripens', '麦が熟し麦秋となる'],
  ['蟷螂生', 'かまきりしょうず', 'Praying mantises hatch', '蟷螂が生まれ出る'],
  ['腐草為蛍', 'くされたるくさほたるとなる', 'Fireflies emerge', '腐った草が蛍になる'],
  ['梅子黄', 'うめのみきばむ', 'Plums turn yellow', '梅の実が黄ばんで熟す'],
  ['乃東枯', 'なつかれくさかるる', 'Self-heal withers', '夏枯草が枯れる'],
  ['菖蒲華', 'あやめはなさく', 'Irises bloom', 'あやめの花が咲く'],
  ['半夏生', 'はんげしょうず', 'Crow-dipper sprouts', '烏柄杓が生える'],
  ['温風至', 'あつかぜいたる', 'Warm winds blow', '暖かい風が吹いてくる'],
  ['蓮始開', 'はすはじめてひらく', 'First lotus blossoms', '蓮の花が開き始める'],
  ['鷹乃学習', 'たかすなわちわざをならう', 'Hawks learn to fly', '鷹の幼鳥が飛ぶことを覚える'],
  ['桐始結花', 'きりはじめてはなをむすぶ', 'Paulownia produces seeds', '桐の花が実を結び始める'],
  ['土潤溽暑', 'つちうるおうてむしあつし', 'Earth is hot and steamy', '土が湿り蒸し暑くなる'],
  ['大雨時行', 'たいうときどきふる', 'Great rains sometimes fall', '時々大雨が降る'],
  ['涼風至', 'すずかぜいたる', 'Cool winds blow', '涼しい風が立ち始める'],
  ['寒蝉鳴', 'ひぐらしなく', 'Evening cicadas sing', '蜩が鳴き始める'],
  ['蒙霧升降', 'ふかききりまとう', 'Thick fog descends', '深い霧が立ち込める'],
  ['綿柎開', 'わたのはなしべひらく', 'Cotton flowers bloom', '綿の実を包む萼が開く'],
  ['天地始粛', 'てんちはじめてさむし', 'Heat starts to dissipate', 'ようやく暑さが鎮まる'],
  ['禾乃登', 'こくものすなわちみのる', 'Rice ripens', '稲が実る'],
  ['草露白', 'くさのつゆしろし', 'Dew glistens white', '草に降りた露が白く光る'],
  ['鶺鴒鳴', 'せきれいなく', 'Wagtails sing', '鶺鴒が鳴き始める'],
  ['玄鳥去', 'つばめさる', 'Swallows leave', '燕が南へ帰っていく'],
  ['雷乃収声', 'かみなりすなわちこえをおさむ', 'Thunder ceases', '雷が鳴り響かなくなる'],
  ['蟄虫坏戸', 'むしかくれてとをふさぐ', 'Insects seal their doors', '虫が土中に籠もり穴をふさぐ'],
  ['水始涸', 'みずはじめてかるる', 'Farmers drain fields', '田畑の水を干し始める'],
  ['鴻雁来', 'こうがんきたる', 'Wild geese return', '雁が飛来し始める'],
  ['菊花開', 'きくのはなひらく', 'Chrysanthemums bloom', '菊の花が咲く'],
  ['蟋蟀在戸', 'きりぎりすとにあり', 'Crickets chirp at the door', '蟋蟀が戸の辺りで鳴く'],
  ['霜始降', 'しもはじめてふる', 'First frost', '霜が降り始める'],
  ['霎時施', 'こさめときどきふる', 'Light rain sometimes falls', '小雨がしとしと降る'],
  ['楓蔦黄', 'もみじつたきばむ', 'Maples and ivy turn yellow', '紅葉や蔦が色づく'],
  ['山茶始開', 'つばきはじめてひらく', 'Camellias bloom', '山茶花が咲き始める'],
  ['地始凍', 'ちはじめてこおる', 'Land starts to freeze', '大地が凍り始める'],
  ['金盞香', 'きんせんかさく', 'Daffodils bloom', '水仙の花が咲く'],
  ['虹蔵不見', 'にじかくれてみえず', 'Rainbows hide', '虹を見かけなくなる'],
  ['朔風払葉', 'きたかぜこのはをはらう', 'North wind blows leaves', '北風が木の葉を払い落とす'],
  ['橘始黄', 'たちばなはじめてきばむ', 'Tangerines begin to turn', '橘の実が黄色く色づき始める'],
  ['閉塞成冬', 'そらさむくふゆとなる', 'Cold sets in, winter begins', '天地の気が塞がり冬となる'],
  ['熊蟄穴', 'くまあなにこもる', 'Bears retreat to dens', '熊が冬ごもりのために穴に入る'],
  ['鱖魚群', 'さけのうおむらがる', 'Salmon gather and swim upstream', '鮭が群がり川を上る'],
  ['乃東生', 'なつかれくさしょうず', 'Self-heal sprouts', '夏枯草が芽を出す'],
  ['麋角解', 'おおしかのつのおつる', 'Deer shed antlers', '大鹿の角が落ちる'],
  ['雪下出麦', 'ゆきわたりてむぎいづる', 'Wheat sprouts under snow', '雪の下で麦が芽を出す'],
]

/** 全72候の定義テーブル */
export const KOU_DEFINITIONS: readonly KouDefinition[] = KOU_DATA.map(
  ([nameJa, readingJa, nameEn, description], index) => ({
    index,
    solarTermName: SOLAR_TERMS[Math.floor(index / 3)][0],
    solarTermNameEn: SOLAR_TERMS[Math.floor(index / 3)][1],
    phase: PHASES[index % 3][0],
    eclipticLonStart: (index * 5 + 285) % 360,
    phaseNameEn: PHASES[index % 3][1],
    phaseNameJa: PHASES[index % 3][2],
    nameJa,
    nameEn,
    readingJa,
    description,
  })
)

/** 太陽黄経から現在の候を解決 */
export function resolveKou(eclipticLon: number): KouDefinition {
  // 黄経を0-360に正規化
  const lon = ((eclipticLon % 360) + 360) % 360
  // 小寒初候(index=0)は黄経285度から開始
  // index = floor((lon - 285 + 360) % 360 / 5)
  const index = Math.floor(((lon - 285 + 360) % 360) / 5)
  return KOU_DEFINITIONS[index]
}

/** 太陽黄経から候内での経過比率を返す（隣接候との補間用） */
export function kouProgress(eclipticLon: number): { kou: KouDefinition; progress: number } {
  const lon = ((eclipticLon % 360) + 360) % 360
  const offset = ((lon - 285 + 360) % 360)
  const index = Math.floor(offset / 5)
  const progress = (offset % 5) / 5
  return { kou: KOU_DEFINITIONS[index], progress }
}
