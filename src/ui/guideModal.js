/**
 * guideModal.js
 * 指標解説モーダル — Gait VISION forPT
 *
 * 「📖 指標ガイド」ボタン押下でモーダルを開き、
 * 前額面・矢状面の各指標について意味・正常範囲・活用法・注意事項を解説する。
 */

// ─── コンテンツ定義 ───────────────────────────────────────────────────────────

const GUIDE_SECTIONS = [
  {
    id: 'overview',
    icon: '🗺️',
    title: 'はじめに・使い方',
    content: `
      <p>Gait VISION forPT のレポートには、歩行解析から自動計算された複数の指標が表示されます。</p>
      <p>このガイドでは各指標の<strong>臨床的な意味・正常範囲・同一人物での変化の解釈・注意事項</strong>を解説します。</p>
      <div class="gv-guide-tip">
        💡 <strong>活用の基本姿勢</strong><br>
        本アプリの指標は MediaPipe の姿勢推定に基づく<em>推定値</em>です。単回の絶対値より、
        <strong>同一条件での複数回比較（経時変化）</strong>で最大限の臨床価値を発揮します。
      </div>

      <div class="gv-guide-metric-block">
        <div class="gv-guide-metric-header">
          <span class="gv-guide-badge gv-badge-blue">🏷️ ステータスバッジの見方</span>
        </div>
        <p style="margin-bottom:0.6rem; font-size:0.82rem; color:#94a3b8;">レポート上に表示される色付きバッジは、各指標の評価を示します。</p>
        <table class="gv-guide-table">
          <tr>
            <th style="width:20%;">バッジ</th>
            <th style="width:25%;">意味</th>
            <th>臨床的解釈</th>
          </tr>
          <tr>
            <td><span style="background:#064e3b;color:#34d399;padding:0.2rem 0.5rem;border-radius:2rem;font-weight:700;font-size:0.8rem;">🟢 正常</span></td>
            <td>正常範囲内</td>
            <td>定義された正常範囲に入っている。継続観察を推奨。</td>
          </tr>
          <tr>
            <td><span style="background:#451a03;color:#fbbf24;padding:0.2rem 0.5rem;border-radius:2rem;font-weight:700;font-size:0.8rem;">🟡 やや逸脱</span></td>
            <td>正常範囲からやや外れている</td>
            <td>軽度の逸脱。経時変化を注意深く観察。改善・悪化いずれの方向かを確認。</td>
          </tr>
          <tr>
            <td><span style="background:#450a0a;color:#f87171;padding:0.2rem 0.5rem;border-radius:2rem;font-weight:700;font-size:0.8rem;">🔴 要注意</span></td>
            <td>正常範囲から大きく逸脱</td>
            <td>臨床的に注意が必要な逸脱。動画と合わせて確認し、必要に応じて介入を検討。</td>
          </tr>
          <tr>
            <td><span style="background:#1e1b4b;color:#a78bfa;padding:0.2rem 0.5rem;border-radius:2rem;font-weight:700;font-size:0.8rem;">💜 良好</span></td>
            <td>良好・改善傾向</td>
            <td>期待値を上回っている（例: 歩行速度が高い、ケイデンスが十分）。</td>
          </tr>
          <tr>
            <td><span style="background:#1a2535;color:#64748b;padding:0.2rem 0.5rem;border-radius:2rem;font-weight:700;font-size:0.8rem;">— 未計算</span></td>
            <td>データ不足で算出不可</td>
            <td>ヒールストライク検出数不足など。動画の長さ・撮影条件を見直す。</td>
          </tr>
        </table>
      </div>

      <div class="gv-guide-metric-block">
        <div class="gv-guide-metric-header">
          <span class="gv-guide-badge gv-badge-orange">📋 レポートの構成</span>
        </div>
        <table class="gv-guide-table">
          <tr><th>前額面レポート</th><td>正面から撮影した動画から算出。<strong>ケイデンス・歩行速度・対称性・体幹側方傾斜</strong>の4指標を表示。</td></tr>
          <tr><th>矢状面レポート</th><td>側方から撮影した動画から算出。<strong>膝ピーク角度（遊脚・立脚）・骨盤傾斜・股関節参考値・足関節</strong>を表示。</td></tr>
          <tr><th>コメント欄</th><td>各指標の逸脱に応じて自動生成されたフィードバック。⚠️マークは要確認項目、✅は良好・改善のサイン。</td></tr>
        </table>
      </div>
    `
  },
  {
    id: 'frontal',
    icon: '🚶',
    title: '前額面の指標',
    content: `
      <div class="gv-guide-metric-block">
        <div class="gv-guide-metric-header">
          <span class="gv-guide-badge gv-badge-blue">📏 ケイデンス（歩調）</span>
          <span class="gv-guide-range">正常: 100〜130 spm</span>
        </div>
        <table class="gv-guide-table">
          <tr><th>何を示すか</th><td>1分間の歩数（steps per minute）。歩行リズムを反映する最も信頼性の高い指標。</td></tr>
          <tr><th>算出方法</th><td>左右のヒールストライク（踵接地）イベントを検出し、間隔から1分間あたりの歩数を換算。</td></tr>
          <tr><th>同一人物で増加したら</th><td>✅ 歩行効率・リズム感の改善。疼痛軽減・筋力回復のサイン。</td></tr>
          <tr><th>同一人物で低下したら</th><td>⚠️ 疲労蓄積、疼痛増悪、神経学的問題（Parkinson 病など）の進行を示唆。</td></tr>
          <tr><th>注意事項</th><td>ヒールストライク検出が必要。歩行イベント「未検出」時は信頼性が低い。短い動画（2〜3歩未満）では算出されない場合がある。</td></tr>
        </table>
      </div>

      <div class="gv-guide-metric-block">
        <div class="gv-guide-metric-header">
          <span class="gv-guide-badge gv-badge-green">🚀 歩行速度</span>
          <span class="gv-guide-range">参考: 0.8〜1.4 m/s</span>
        </div>
        <table class="gv-guide-table">
          <tr><th>何を示すか</th><td>股関節変位量を身長スケールで推定した歩行速度。相対的変化の追跡に利用する。</td></tr>
          <tr><th>算出方法</th><td>MediaPipe の股関節ランドマーク（腰点）の前後移動量と推定身長から速度を計算。絶対距離ではなく推定値。</td></tr>
          <tr><th>同一人物で増加したら</th><td>✅ 機能改善・疼痛軽減・自信回復のサイン。</td></tr>
          <tr><th>同一人物で低下したら</th><td>⚠️ 全身機能低下・疼痛・恐怖心の増大。転倒リスク上昇の指標（0.8 m/s 未満は注意）。</td></tr>
          <tr><th>注意事項</th><td>⚠️ <strong>絶対値の信頼性は低い（推定値）。</strong>撮影距離・カメラ位置が変わると変動する。同一条件下での比較に限定して使用。</td></tr>
        </table>
      </div>

      <div class="gv-guide-metric-block">
        <div class="gv-guide-metric-header">
          <span class="gv-guide-badge gv-badge-purple">⚖️ 対称性</span>
          <span class="gv-guide-range">正常: 90〜100 %</span>
        </div>
        <table class="gv-guide-table">
          <tr><th>何を示すか</th><td>左右の歩行イベント間隔の比率。100% = 完全対称。片麻痺・疼痛跛行の定量化に有用。</td></tr>
          <tr><th>算出方法</th><td>左ヒールストライク → 右ヒールストライク → 次の左ヒールストライクの時間間隔を計算し、左右比率を算出。</td></tr>
          <tr><th>同一人物で増加したら</th><td>✅ 片側への偏りが改善。疼痛軽減・筋力バランス回復の客観的エビデンス。</td></tr>
          <tr><th>同一人物で低下したら</th><td>⚠️ 代償パターンの増大・疼痛悪化・疲労による左右差の拡大。</td></tr>
          <tr><th>注意事項</th><td>⚠️ <strong>歩行イベント（ヒールストライク）未検出時は「参考値」。</strong>レポート上の「⚠ 歩行イベント未検出のため参考値」バッジに注意。85% 未満は病的非対称の目安。</td></tr>
        </table>
      </div>

      <div class="gv-guide-metric-block">
        <div class="gv-guide-metric-header">
          <span class="gv-guide-badge gv-badge-orange">🏋️ 体幹側方傾斜</span>
          <span class="gv-guide-range">正常: 〜10°</span>
        </div>
        <table class="gv-guide-table">
          <tr><th>何を示すか</th><td>前額面（カメラ正面方向）での体幹の左右への傾き量。Trendelenburg 様代償・中殿筋弱化を反映。</td></tr>
          <tr><th>算出方法</th><td>肩中点と股関節中点を結ぶ線の水平からのずれ角度の全フレーム平均値。</td></tr>
          <tr><th>同一人物で減少したら</th><td>✅ 中殿筋筋力改善・骨盤安定性向上・疼痛回避代償の軽減。</td></tr>
          <tr><th>同一人物で増加したら</th><td>⚠️ 疲労・疼痛増大による代償の拡大、または機能低下のサイン。</td></tr>
          <tr><th>注意事項</th><td>歩行周期中に左右交互に傾くため、全フレームの平均値を表示。ピーク（立脚期最大傾斜）の方が感度は高いが現在は平均のみ計測。</td></tr>
        </table>
      </div>
    `
  },
  {
    id: 'sagittal-knee',
    icon: '🦵',
    title: '矢状面: 膝関節指標',
    content: `
      <div class="gv-guide-callout">
        <strong>📌 膝関節指標は2種類あります</strong><br>
        ① <em>ピーク値</em>（ストライド中央値）: 遊脚期最大屈曲・立脚最小伸展 — 最も臨床価値が高い<br>
        ② <em>平均値</em>（全フレーム平均）: 立脚・遊脚が混在するため絶対値より左右差の比較に活用
      </div>

      <div class="gv-guide-metric-block">
        <div class="gv-guide-metric-header">
          <span class="gv-guide-badge gv-badge-green">🦵 遊脚期最大屈曲ピーク</span>
          <span class="gv-guide-range">正常: 55〜70°</span>
        </div>
        <table class="gv-guide-table">
          <tr><th>何を示すか</th><td>遊脚中期の最大膝屈曲角度（足を前に振り出す際の最大曲がり具合）。足趾クリアランスに直結。</td></tr>
          <tr><th>算出方法</th><td>ヒールストライク間の1ストライドで最も膝が曲がった瞬間の角度を測定し、左右各2ストライド以上の中央値を算出。</td></tr>
          <tr><th>同一人物で増加したら</th><td>✅ 筋力・可動域の改善。蹴り出し力・ハムストリングス柔軟性の向上。転倒リスクの低下。</td></tr>
          <tr><th>同一人物で低下したら</th><td>⚠️ 足趾クリアランス不足（つまずき・転倒リスク増大）。大腿四頭筋弱化・股関節屈曲制限・疼痛回避を示唆。<br>50° 未満は🟡やや逸脱。45° 未満は🔴要注意。</td></tr>
          <tr><th>左右差が大きい場合</th><td>⚠️ 10° 超でやや差あり、15° 超は要注意。片側の疼痛・神経障害・筋力差を示唆。</td></tr>
          <tr><th>注意事項</th><td>ヒールストライクが左右各 2 ストライド以上検出された場合のみ算出（中央値）。ストライド不足時は「未計算」と表示。より正確な計測には 5〜10 歩以上の歩行動画を推奨。</td></tr>
        </table>
      </div>

      <div class="gv-guide-metric-block">
        <div class="gv-guide-metric-header">
          <span class="gv-guide-badge gv-badge-purple">🦵 立脚最小伸展（立脚伸展ピーク）</span>
          <span class="gv-guide-range">正常: 5〜15°</span>
        </div>
        <table class="gv-guide-table">
          <tr><th>何を示すか</th><td>立脚終期（蹴り出し直前）の膝角度の最小値。ほぼ伸展していることが正常（完全伸展=0°）。</td></tr>
          <tr><th>算出方法</th><td>ヒールストライク間の1ストライドで最も膝が伸びた瞬間の角度を測定し、中央値を算出。</td></tr>
          <tr><th>同一人物で減少したら</th><td>✅ 伸展改善。疼痛軽減・痙縮軽減・膝伸展筋力の回復。</td></tr>
          <tr><th>同一人物で増加したら</th><td>⚠️ Crouch 歩行パターンの悪化。大腿四頭筋への負担増大（エネルギー効率低下）。<br>15〜20° は🟡やや逸脱。20° 超は🔴要注意。</td></tr>
          <tr><th>注意事項</th><td>痙縮・疼痛・拘縮・筋力低下など複数の原因を考慮。単独では原因を特定できない。過去の膝関節手術歴・変形がある場合は正常範囲が異なる場合がある。</td></tr>
        </table>
      </div>

      <div class="gv-guide-metric-block">
        <div class="gv-guide-metric-header">
          <span class="gv-guide-badge gv-badge-blue">📊 膝関節平均角度・左右差</span>
          <span class="gv-guide-range">左右差: 〜10°</span>
        </div>
        <table class="gv-guide-table">
          <tr><th>何を示すか</th><td>全歩行フレームの平均膝角度。立脚相・遊脚相が混在するため絶対値の解釈は限定的。</td></tr>
          <tr><th>活用方法</th><td>主に<strong>左右差の経時変化</strong>を追跡する。左右差が縮小すれば非対称の改善を示す。</td></tr>
          <tr><th>注意事項</th><td>絶対値単独での評価は推奨しない。ピーク値が取得できている場合はピーク値を優先して参照。</td></tr>
        </table>
      </div>
    `
  },
  {
    id: 'sagittal-other',
    icon: '🩺',
    title: '矢状面: 骨盤・股・足関節',
    content: `
      <div class="gv-guide-metric-block">
        <div class="gv-guide-metric-header">
          <span class="gv-guide-badge gv-badge-orange">🦴 骨盤傾斜</span>
          <span class="gv-guide-range">正常: 〜10°</span>
        </div>
        <table class="gv-guide-table">
          <tr><th>何を示すか</th><td>矢状面（横から見た）骨盤の前後傾き。過剰な前傾は腰椎前弯増大、後傾は推進力低下に関連。</td></tr>
          <tr><th>算出方法</th><td>股関節（腰点）と肩中点を結んだ線の垂直からのずれ角度を近似値として算出した全フレーム平均。</td></tr>
          <tr><th>同一人物で減少したら</th><td>✅ 体幹・骨盤安定性の向上。腰椎-骨盤リズムの改善。</td></tr>
          <tr><th>同一人物で増加したら</th><td>⚠️ 疼痛・疲労による代償的骨盤前傾の増大（腰痛の悪化・ハムストリングス短縮）の可能性。</td></tr>
          <tr><th>注意事項</th><td>本計測は矢状面から推定したもの。骨盤の3次元的動態は本アプリでは完全には計測できない。体幹前傾が大きい場合は数値が過大に出る場合がある。</td></tr>
        </table>
      </div>

      <div class="gv-guide-metric-block">
        <div class="gv-guide-metric-header">
          <span class="gv-guide-badge gv-badge-red">⚠️ 股関節角度（参考値）</span>
          <span class="gv-guide-range">左右差: 〜10° を参考に</span>
        </div>
        <table class="gv-guide-table">
          <tr><th>何を示すか</th><td>「肩中点 − 股関節 − 膝中点」の3D角度。純粋な股関節屈伸角度（骨盤-大腿骨）ではない。</td></tr>
          <tr><th>活用方法</th><td><strong>左右差の変化を追跡する</strong>ことで骨盤代償の変化を参考に評価できる。</td></tr>
          <tr><th>同一人物で左右差が縮小したら</th><td>✅ 左右の体幹-大腿角度の対称化。代償の軽減を示唆。</td></tr>
          <tr><th>注意事項</th><td>⚠️ <strong>絶対値の臨床解釈は推奨しない。</strong>体幹前傾の影響を受けるため、角度の大きさ単独では股関節の状態を判断できない。「参考値」として扱うこと。</td></tr>
        </table>
      </div>

      <div class="gv-guide-metric-block">
        <div class="gv-guide-metric-header">
          <span class="gv-guide-badge gv-badge-green">🦶 足関節角度・左右差</span>
          <span class="gv-guide-range">左右差: 〜5°</span>
        </div>
        <table class="gv-guide-table">
          <tr><th>何を示すか</th><td>膝−足首−足趾の角度（足関節背屈/底屈を反映）。蹴り出し力の左右差評価に活用。</td></tr>
          <tr><th>活用方法</th><td>絶対値よりも<strong>左右差</strong>と<strong>経時変化</strong>を重視する。片側の蹴り出し低下の指標として活用。</td></tr>
          <tr><th>同一人物で左右差が縮小したら</th><td>✅ 蹴り出し対称性の改善。足関節可動域や筋力バランスの向上。</td></tr>
          <tr><th>同一人物で左右差が拡大したら</th><td>⚠️ 蹴り出しの非対称増大。アキレス腱・ふくらはぎの疼痛・拘縮・筋力差。</td></tr>
          <tr><th>注意事項</th><td>足趾の細かい動態は本アプリの解像度では取得困難。大まかなトレンドの把握に活用。靴の種類（かかとの高さ）によって数値が変わる場合がある。</td></tr>
        </table>
      </div>
    `
  },
  {
    id: 'reliability',
    icon: '🔬',
    title: '信頼性ランクと活用注意',
    content: `
      <p style="margin-bottom:0.75rem;">各指標の信頼性を3段階でランク付けします（本アプリの計測特性に基づく）。</p>
      <table class="gv-guide-table gv-guide-reliability-table">
        <thead>
          <tr>
            <th>ランク</th>
            <th>指標</th>
            <th>推奨される使い方</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><span class="gv-rank-high">🟢 高</span></td>
            <td>ケイデンス</td>
            <td>絶対値・経時変化ともに信頼性高い。主要アウトカム指標として活用可。</td>
          </tr>
          <tr>
            <td><span class="gv-rank-mid">🟡 中</span></td>
            <td>対称性</td>
            <td>歩行イベント検出時のみ信頼性高い。未検出時は除外。</td>
          </tr>
          <tr>
            <td><span class="gv-rank-mid">🟡 中</span></td>
            <td>遊脚期膝最大屈曲ピーク</td>
            <td>ストライド ≥ 2 回の中央値として算出。経時変化トレンドに活用。</td>
          </tr>
          <tr>
            <td><span class="gv-rank-mid">🟡 中</span></td>
            <td>立脚期膝最小伸展ピーク</td>
            <td>同上。Crouch 歩行の定量的追跡に有用。</td>
          </tr>
          <tr>
            <td><span class="gv-rank-mid">🟡 中</span></td>
            <td>体幹側方傾斜（前額面）</td>
            <td>同一条件での経時変化に活用。単回の絶対値は参考程度。</td>
          </tr>
          <tr>
            <td><span class="gv-rank-low">🟠 低</span></td>
            <td>歩行速度</td>
            <td>推定値。同一条件・同一カメラ距離での比較のみ有効。</td>
          </tr>
          <tr>
            <td><span class="gv-rank-low">🟠 低</span></td>
            <td>股関節角度（絶対値）</td>
            <td>体幹角度の影響を受ける。左右差の変化のみ参考にする。</td>
          </tr>
          <tr>
            <td><span class="gv-rank-low">🟠 低</span></td>
            <td>骨盤傾斜</td>
            <td>矢状面推定値。経時変化トレンドを参考程度に確認。</td>
          </tr>
        </tbody>
      </table>

      <div class="gv-guide-tip" style="margin-top:1rem;">
        🏥 <strong>臨床的活用のポイント</strong><br>
        ① <strong>同一条件を揃える</strong>: 同じ撮影距離・角度・時間帯・履物で撮影する<br>
        ② <strong>複数指標を組み合わせる</strong>: ケイデンス↑ + 遊脚膝屈曲↑ = 歩行機能全般の改善 など<br>
        ③ <strong>動画と照合する</strong>: 指標の変化を解析動画で目視確認してから臨床判断に使用<br>
        ④ <strong>医療行為の代替ではない</strong>: 本アプリはスクリーニング・変化追跡ツール。診断・治療方針は必ず専門家が判断する
      </div>

      <div class="gv-guide-metric-block" style="margin-top:0.85rem;">
        <div class="gv-guide-metric-header">
          <span class="gv-guide-badge gv-badge-blue">❓ よくある疑問</span>
        </div>
        <table class="gv-guide-table">
          <tr>
            <th>「未計算」と表示される</th>
            <td>ヒールストライク（踵接地）が左右それぞれ 2 回以上検出されなかった場合。動画を 10 歩以上歩く長さにすると改善されやすい。また、歩行が速すぎる・遅すぎる・カメラアングルが悪いと検出精度が落ちる。</td>
          </tr>
          <tr>
            <th>数値が毎回大きく変わる</th>
            <td>撮影条件（距離・角度・照明）が変わると数値は変化する。同一条件での比較が前提。「どれだけ変化したか」を見るため、撮影プロトコルを統一することが重要。</td>
          </tr>
          <tr>
            <th>角度の意味が直感と逆に感じる</th>
            <td>膝ピーク値は「MediaPipe の推定角度を臨床角度に変換（180° − 推定値）」したもの。臨床での屈曲角度（完全伸展=0°）と一致するよう設計。</td>
          </tr>
          <tr>
            <th>コメントが「要確認」だが歩行は正常に見える</th>
            <td>本アプリのしきい値は一般成人の参考値。高齢者・疾患によっては正常範囲が異なる。コメントはあくまで参考。動画目視とあわせて総合判断を。</td>
          </tr>
        </table>
      </div>
    `
  },
  {
    id: 'shooting',
    icon: '📹',
    title: '正確な計測のための撮影ガイド',
    content: `
      <div class="gv-guide-shooting-grid">
        <div class="gv-guide-shooting-item">
          <div class="gv-guide-shooting-icon">📐</div>
          <div class="gv-guide-shooting-title">前額面（正面）撮影</div>
          <ul>
            <li>カメラを被験者の正面 2〜4m 程度に設置</li>
            <li>カメラの高さ: 腰部〜腹部の高さ</li>
            <li>歩行方向: カメラに向かって歩く（往復 or 通り過ぎ）</li>
            <li>目的指標: 速度・ケイデンス・対称性・体幹側方傾斜</li>
          </ul>
        </div>
        <div class="gv-guide-shooting-item">
          <div class="gv-guide-shooting-icon">🎯</div>
          <div class="gv-guide-shooting-title">矢状面（側方）撮影</div>
          <ul>
            <li>カメラを被験者の真横 2〜4m 程度に設置</li>
            <li>カメラの高さ: 腰部〜腹部の高さ</li>
            <li>歩行方向: カメラと平行に歩く</li>
            <li>目的指標: 膝ピーク角度・骨盤傾斜・股関節参考値</li>
          </ul>
        </div>
      </div>
      <div class="gv-guide-shooting-common">
        <div class="gv-guide-shooting-title">共通の注意事項</div>
        <ul>
          <li>⚠️ 体型・関節が見える服装（ランニングウェア等）を着用してもらうと精度が上がる</li>
          <li>⚠️ 照明は均一に。逆光・強いシャドウは姿勢推定精度を低下させる</li>
          <li>⚠️ 全身が映るようにフレームを調整（頭頂〜足底まで）</li>
          <li>⚠️ 解析中はカメラを動かさない（固定推奨）</li>
          <li>⚠️ 歩行は最低 10〜15 歩以上映っているとピーク値の精度が上がる</li>
          <li>📱 スマートフォンで撮影する場合は三脚・スタンドの使用を推奨</li>
        </ul>
      </div>

      <div class="gv-guide-tip" style="margin-top:0.85rem;">
        🔁 <strong>再現性を高めるチェックリスト</strong><br>
        □ 毎回同じ場所（床マーカー等）でカメラを設置する<br>
        □ 同じ履物・同じ時間帯で計測する<br>
        □ 動画ファイル名に日付・解析面（前額/矢状）を含める（例: 20260401_sagittal.mp4）<br>
        □ 解析後は動画と指標を照合し、明らかな誤検出がないか確認する
      </div>
    `
  }
];

// ─── HTML 生成 ─────────────────────────────────────────────────────────────────

function buildTabNav(sections) {
  return sections.map((s, i) => `
    <button class="gv-tab-btn ${i === 0 ? 'active' : ''}" data-tab="${s.id}">
      ${s.icon} ${s.title}
    </button>
  `).join('');
}

function buildTabPanels(sections) {
  return sections.map((s, i) => `
    <div class="gv-tab-panel ${i === 0 ? 'active' : ''}" id="gv-panel-${s.id}">
      <h3 class="gv-panel-title">${s.icon} ${s.title}</h3>
      ${s.content}
    </div>
  `).join('');
}

export function buildGuideHtml() {
  return `
    <div class="gv-guide-container">
      <nav class="gv-tab-nav" role="tablist">
        ${buildTabNav(GUIDE_SECTIONS)}
      </nav>
      <div class="gv-tab-content">
        ${buildTabPanels(GUIDE_SECTIONS)}
      </div>
    </div>
  `;
}

// ─── モーダル開閉 ─────────────────────────────────────────────────────────────

export function openGuideModal({ documentRef }) {
  const modal = documentRef.getElementById('guide-modal');
  if (!modal) return;
  modal.classList.add('show');
  documentRef.body.style.overflow = 'hidden';

  // タブコンテンツを初回のみ挿入
  const content = modal.querySelector('#guide-modal-body');
  if (content && !content.dataset.initialized) {
    content.innerHTML = buildGuideHtml();
    content.dataset.initialized = 'true';
    initTabs(content);
  }
}

export function closeGuideModal({ documentRef }) {
  const modal = documentRef.getElementById('guide-modal');
  if (!modal) return;
  modal.classList.remove('show');
  documentRef.body.style.overflow = '';
}

// ─── タブ切り替え ─────────────────────────────────────────────────────────────

function initTabs(container) {
  const buttons = container.querySelectorAll('.gv-tab-btn');
  const panels  = container.querySelectorAll('.gv-tab-panel');

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      buttons.forEach((b) => b.classList.toggle('active', b.dataset.tab === target));
      panels.forEach((p) => p.classList.toggle('active', p.id === `gv-panel-${target}`));
    });
  });
}
