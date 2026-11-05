/** 외국인 한국어 배우기 화면 글: 학습자 모국어로 보여 준다(배울 한국어만 한국어로). */
import type { Lang } from '../engine/lang'
import type { Situation, VideoKind } from '../content/learnVideos'

export interface LearnText {
  langName: string
  htmlLang: string
  title: string
  lead: string
  choose: string
  change: string
  all: string
  tags: Record<Situation, string>
  kinds: Record<VideoKind, string>
  min: (m: number) => string
  pasteLink: string
  open: string
  modes: { listen: string; line: string; sing: string }
  modeHelp: { listen: string; line: string; sing: string }
  speed: string
  showMeaning: string
  showSound: string
  playLine: string
  readLine: string
  repeat3: string
  save: string
  saved: string
  savedTitle: string
  savedEmpty: string
  worksheet: string
  print: string
  remove: string
  tapWord: string
  tapBlank: string
  loading: string
  noMeaning: string
  wordAdded: (w: string) => string
  words: string
  errors: { noTrack: string; quota: string; notConnected: string; blocked: string; other: string }
  sheet: { heading: string; guide: string; name: string; date: string; month: string; day: string; empty: string }
  back: string
}

const zh: LearnText = {
  langName: '简体中文',
  htmlLang: 'zh-CN',
  title: '学韩语',
  lead: '跟着儿歌和动画，一句一句听、读、唱。',
  choose: '请选择你的语言',
  change: '换语言',
  all: '全部',
  tags: { greet: '见面·问候', family: '家人', body: '身体·医院', number: '数字·时间', nature: '动物·自然', season: '季节·节日', feeling: '心情' },
  kinds: { song: '儿歌', cartoon: '动画', story: '童话' },
  min: (m) => `${m}分钟`,
  pasteLink: '粘贴YouTube链接（需有韩语字幕）',
  open: '打开',
  modes: { listen: '听', line: '一句一句', sing: '跟着唱' },
  modeHelp: {
    listen: '看着歌词听到最后。现在唱的句子会亮起来。',
    line: '点一句，这一句会重复播放三遍。',
    sing: '部分歌词变成空格。看着意思跟着唱，点空格可以看答案。',
  },
  speed: '速度',
  showMeaning: '意思',
  showSound: '发音',
  playLine: '播放这一句',
  readLine: '慢慢读这一句',
  repeat3: '重复三遍',
  save: '收藏这句',
  saved: '已收藏',
  savedTitle: '收藏的句子',
  savedEmpty: '点句子旁边的 ☆ 收藏，就可以做成书写练习纸。',
  worksheet: '书写练习纸',
  print: '打印 / 保存PDF',
  remove: '删除',
  tapWord: '点单词听发音',
  tapBlank: '点空格看答案',
  loading: '正在准备歌词…',
  noMeaning: '这个视频暂时没有中文意思。',
  wordAdded: (w) => `「${w}」已加入单词本`,
  words: '单词本',
  errors: {
    noTrack: '这个视频没有韩语字幕，请换一个视频。',
    quota: '今天能打开的新视频已经用完了，明天再试试。已经打开过的视频可以继续看。',
    notConnected: '现在还不能读取视频字幕。',
    blocked: '视频作者不允许在其他网站播放。',
    other: '出了点问题，请再试一次。',
  },
  sheet: { heading: '韩语书写练习', guide: '一边读句子，一边慢慢写。', name: '姓名', date: '日期', month: '月', day: '日', empty: '还没有收藏的句子。' },
  back: '返回',
}

const tw: LearnText = {
  ...zh,
  langName: '繁體中文',
  htmlLang: 'zh-TW',
  title: '學韓語',
  lead: '跟著兒歌和動畫，一句一句聽、讀、唱。',
  choose: '請選擇你的語言',
  change: '換語言',
  all: '全部',
  tags: { greet: '見面·問候', family: '家人', body: '身體·醫院', number: '數字·時間', nature: '動物·自然', season: '季節·節日', feeling: '心情' },
  kinds: { song: '兒歌', cartoon: '動畫', story: '童話' },
  min: (m) => `${m}分鐘`,
  pasteLink: '貼上YouTube連結（需有韓語字幕）',
  open: '打開',
  modes: { listen: '聽', line: '一句一句', sing: '跟著唱' },
  modeHelp: {
    listen: '看著歌詞聽到最後。現在唱的句子會亮起來。',
    line: '點一句，這一句會重複播放三遍。',
    sing: '部分歌詞變成空格。看著意思跟著唱，點空格可以看答案。',
  },
  speed: '速度',
  showMeaning: '意思',
  showSound: '發音',
  playLine: '播放這一句',
  readLine: '慢慢讀這一句',
  repeat3: '重複三遍',
  save: '收藏這句',
  saved: '已收藏',
  savedTitle: '收藏的句子',
  savedEmpty: '點句子旁邊的 ☆ 收藏，就可以做成書寫練習紙。',
  worksheet: '書寫練習紙',
  print: '列印 / 存成PDF',
  remove: '刪除',
  tapWord: '點單字聽發音',
  tapBlank: '點空格看答案',
  loading: '正在準備歌詞…',
  noMeaning: '這個影片暫時沒有中文意思。',
  wordAdded: (w) => `「${w}」已加入單字本`,
  words: '單字本',
  errors: {
    noTrack: '這個影片沒有韓語字幕，請換一個影片。',
    quota: '今天能打開的新影片已經用完了，明天再試試。已經打開過的影片可以繼續看。',
    notConnected: '現在還不能讀取影片字幕。',
    blocked: '影片作者不允許在其他網站播放。',
    other: '出了點問題，請再試一次。',
  },
  sheet: { heading: '韓語書寫練習', guide: '一邊讀句子，一邊慢慢寫。', name: '姓名', date: '日期', month: '月', day: '日', empty: '還沒有收藏的句子。' },
  back: '返回',
}

const mn: LearnText = {
  langName: 'Монгол хэл',
  htmlLang: 'mn',
  title: 'Солонгос хэл сурах',
  lead: 'Хүүхдийн дуу, хүүхэлдэйн киногоор өгүүлбэр бүрийг сонсож, уншиж, дуулаарай.',
  choose: 'Хэлээ сонгоно уу',
  change: 'Хэл солих',
  all: 'Бүгд',
  tags: { greet: 'Танилцах·мэндлэх', family: 'Гэр бүл', body: 'Бие·эмнэлэг', number: 'Тоо·цаг', nature: 'Амьтан·байгаль', season: 'Улирал·баяр', feeling: 'Сэтгэл' },
  kinds: { song: 'Дуу', cartoon: 'Хүүхэлдэйн кино', story: 'Үлгэр' },
  min: (m) => `${m} мин`,
  pasteLink: 'YouTube холбоос оруулах (солонгос хадмалтай)',
  open: 'Нээх',
  modes: { listen: 'Сонсох', line: 'Мөр мөрөөр', sing: 'Дагаж дуулах' },
  modeHelp: {
    listen: 'Үгийг харж эцэс хүртэл сонсоорой. Одоо дуулж буй мөр тодорно.',
    line: 'Мөр дээр дарвал тэр мөр 3 удаа давтагдана.',
    sing: 'Зарим үг хоосон болно. Утгыг нь харж дагаж дуулаарай. Хоосон зай дээр дарвал хариу гарна.',
  },
  speed: 'Хурд',
  showMeaning: 'Утга',
  showSound: 'Дуудлага',
  playLine: 'Энэ мөрийг тоглуулах',
  readLine: 'Энэ мөрийг удаан унших',
  repeat3: '3 удаа давтах',
  save: 'Хадгалах',
  saved: 'Хадгалсан',
  savedTitle: 'Хадгалсан өгүүлбэрүүд',
  savedEmpty: 'Өгүүлбэрийн хажуугийн ☆ дээр дарж хадгалбал бичих дасгалын хуудас болгоно.',
  worksheet: 'Бичих дасгал',
  print: 'Хэвлэх / PDF хадгалах',
  remove: 'Устгах',
  tapWord: 'Үг дээр дарвал дуудлагыг сонсоно',
  tapBlank: 'Хоосон зай дээр дарж хариуг харна',
  loading: 'Дууны үгийг бэлдэж байна…',
  noMeaning: 'Энэ бичлэгт монгол утга одоохондоо алга.',
  wordAdded: (w) => `"${w}" үгийн санд нэмэгдлээ`,
  words: 'Үгийн сан',
  errors: {
    noTrack: 'Энэ бичлэгт солонгос хадмал байхгүй. Өөр бичлэг сонгоно уу.',
    quota: 'Өнөөдөр шинэ бичлэг нээх эрх дууссан. Маргааш дахин оролдоорой. Өмнө нээсэн бичлэгээ үзэж болно.',
    notConnected: 'Одоогоор хадмалыг уншиж чадахгүй байна.',
    blocked: 'Бичлэгийн эзэн өөр сайтад тоглуулахыг хориглосон.',
    other: 'Алдаа гарлаа. Дахин оролдоно уу.',
  },
  sheet: { heading: 'Солонгос бичих дасгал', guide: 'Өгүүлбэрийг уншингаа аажмаар бичээрэй.', name: 'Нэр', date: 'Огноо', month: 'сар', day: 'өдөр', empty: 'Хадгалсан өгүүлбэр алга.' },
  back: 'Буцах',
}

const ja: LearnText = {
  langName: '日本語',
  htmlLang: 'ja',
  title: '韓国語をまなぶ',
  lead: '童謡やアニメで、一文ずつ聞いて、読んで、歌いましょう。',
  choose: '言語をえらんでください',
  change: '言語をかえる',
  all: 'すべて',
  tags: { greet: '出会い・あいさつ', family: '家族', body: '体・病院', number: '数・時間', nature: '動物・自然', season: '季節・行事', feeling: '気持ち' },
  kinds: { song: '童謡', cartoon: 'アニメ', story: '童話' },
  min: (m) => `${m}分`,
  pasteLink: 'YouTubeのリンクを貼る（韓国語字幕つき）',
  open: '開く',
  modes: { listen: '聞く', line: '一文ずつ', sing: 'いっしょに歌う' },
  modeHelp: {
    listen: '歌詞を見ながら最後まで聞きます。いま歌っている行が光ります。',
    line: '行を押すと、その行を3回くり返します。',
    sing: '歌詞の一部が空欄になります。意味を見ながら歌いましょう。空欄を押すと答えが出ます。',
  },
  speed: '速さ',
  showMeaning: '意味',
  showSound: '発音',
  playLine: 'この行を再生',
  readLine: 'この行をゆっくり読む',
  repeat3: '3回くり返す',
  save: '保存',
  saved: '保存ずみ',
  savedTitle: '保存した文',
  savedEmpty: '文の横の ☆ を押して保存すると、書き取りプリントになります。',
  worksheet: '書き取りプリント',
  print: '印刷 / PDFで保存',
  remove: '削除',
  tapWord: '単語を押すと発音が聞けます',
  tapBlank: '空欄を押すと答えが出ます',
  loading: '歌詞を準備しています…',
  noMeaning: 'この動画にはまだ日本語の意味がありません。',
  wordAdded: (w) => `「${w}」を単語帳に入れました`,
  words: '単語帳',
  errors: {
    noTrack: 'この動画には韓国語字幕がありません。別の動画をえらんでください。',
    quota: '今日ひらける新しい動画は終わりました。明日また試してください。ひらいたことのある動画は見られます。',
    notConnected: 'いまは字幕を読み込めません。',
    blocked: '動画の持ち主が、ほかのサイトでの再生を止めています。',
    other: '問題が起きました。もう一度ためしてください。',
  },
  sheet: { heading: '韓国語 書き取り', guide: '文を読みながら、ゆっくり書きましょう。', name: '名前', date: '日付', month: '月', day: '日', empty: '保存した文がありません。' },
  back: 'もどる',
}

const en: LearnText = {
  langName: 'English',
  htmlLang: 'en',
  title: 'Learn Korean',
  lead: 'Listen, read and sing along with Korean kids’ songs and cartoons, one line at a time.',
  choose: 'Choose your language',
  change: 'Change language',
  all: 'All',
  tags: { greet: 'Meeting · Greetings', family: 'Family', body: 'Body · Hospital', number: 'Numbers · Time', nature: 'Animals · Nature', season: 'Seasons · Holidays', feeling: 'Feelings' },
  kinds: { song: 'Song', cartoon: 'Cartoon', story: 'Story' },
  min: (m) => `${m} min`,
  pasteLink: 'Paste a YouTube link (with Korean subtitles)',
  open: 'Open',
  modes: { listen: 'Listen', line: 'Line by line', sing: 'Sing along' },
  modeHelp: {
    listen: 'Follow the lyrics to the end. The line being sung lights up.',
    line: 'Tap a line to hear it three times.',
    sing: 'Some words turn into blanks. Sing along using the meaning. Tap a blank to see the answer.',
  },
  speed: 'Speed',
  showMeaning: 'Meaning',
  showSound: 'Pronunciation',
  playLine: 'Play this line',
  readLine: 'Read this line slowly',
  repeat3: 'Repeat 3 times',
  save: 'Save',
  saved: 'Saved',
  savedTitle: 'Saved sentences',
  savedEmpty: 'Tap ☆ next to a sentence to save it. Saved sentences become a writing worksheet.',
  worksheet: 'Writing worksheet',
  print: 'Print / Save as PDF',
  remove: 'Remove',
  tapWord: 'Tap a word to hear it',
  tapBlank: 'Tap a blank to see the answer',
  loading: 'Getting the lyrics ready…',
  noMeaning: 'This video has no English meaning yet.',
  wordAdded: (w) => `Added “${w}” to your word list`,
  words: 'Word list',
  errors: {
    noTrack: 'This video has no Korean subtitles. Please choose another one.',
    quota: 'No more new videos can be opened today. Try again tomorrow. Videos you opened before still work.',
    notConnected: 'Subtitles can’t be loaded right now.',
    blocked: 'The video owner doesn’t allow playing it on other sites.',
    other: 'Something went wrong. Please try again.',
  },
  sheet: { heading: 'Korean Writing Practice', guide: 'Read each sentence and write it slowly.', name: 'Name', date: 'Date', month: '/', day: '', empty: 'No saved sentences yet.' },
  back: 'Back',
}

export const LEARN_TEXT: Record<Lang, LearnText> = { zh, tw, mn, ja, en }

/** 홈 버튼: 누구든 자기 말로 알아보게 여러 말로 */
export const LEARN_BUTTON = ['Learn Korean', '学韩语', '學韓語', 'Солонгос хэл', '韓国語']
