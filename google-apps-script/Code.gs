/**
 * CalculaRàpid — Google Apps Script per registrar els resultats de l'alumnat
 * en un full separat per a cada curs (1r, 2n, 3r i 4t d'ESO).
 *
 * Instruccions ràpides:
 * 1. Obre el Google Sheets -> Extensions -> Apps Script.
 * 2. Enganxa aquest codi a Code.gs i desa.
 * 3. Executa la funció `inicialitzarFulls` una vegada per crear els 4 fulls.
 * 4. Fes clic a "Implementa" -> "Nova implementació" -> "Aplicació web":
 *    - Executar com a: Jo (el teu compte)
 *    - Qui té accés: Tothom
 * 5. Copia l'URL acabat en `/exec` i comparteix-lo per connectar-lo amb l'app.
 */

const COURSE_SHEETS = ["1r d'ESO", "2n d'ESO", "3r d'ESO", "4t d'ESO"];
const VALID_GROUPS = ['A', 'B', 'C'];

const HEADERS = [
  'Data i hora',
  'Nom i Cognoms',
  'Classe',
  'Nivell',
  'Operacions',
  'Tipus de preguntes',
  'Encerts',
  'Total preguntes',
  'Precisió (%)',
  'Indirectes (encerts/total)',
  'Temps mitjà (s)',
  'Millor ratxa',
  'Estrelles ronda',
  'Estrelles totals',
  'Nivell màxim assolit',
];

/**
 * Afegeix un menú propi al Google Sheets per poder crear o revisar els fulls manualment.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('CalculaRàpid')
    .addItem('Crear / verificar fulls de cursos', 'inicialitzarFulls')
    .addToUi();
}

/**
 * Crea els 4 fulls (1r, 2n, 3r i 4t d'ESO) si no existeixen i prepara la capçalera.
 */
function inicialitzarFulls() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  for (let i = 0; i < COURSE_SHEETS.length; i++) {
    ensureCourseSheet_(ss, COURSE_SHEETS[i]);
  }
}

function ensureCourseSheet_(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setValues([HEADERS]);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#0284c7');
    headerRange.setFontColor('#ffffff');
    sheet.setFrozenRows(1);

    // Amplades recomanades per a una lectura còmoda
    sheet.setColumnWidth(1, 165); // Data i hora
    sheet.setColumnWidth(2, 220); // Nom i Cognoms
    sheet.setColumnWidth(3, 80);  // Classe
    sheet.setColumnWidth(4, 130); // Nivell
    sheet.setColumnWidth(5, 190); // Operacions
    sheet.setColumnWidth(6, 135); // Tipus
    sheet.setColumnWidth(9, 105); // Precisió (%)
    sheet.setColumnWidth(10, 175); // Indirectes
  }

  return sheet;
}

/**
 * Evita injecció de fórmules en cel·les de text procedents de l'exterior.
 */
function sanitizeCellText_(value, maxLen) {
  const text = String(value || '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, maxLen || 100);
  if (!text) return '';
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function toInt_(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const rounded = Math.round(n);
  if (rounded < min) return min;
  if (rounded > max) return max;
  return rounded;
}

function toSeconds_(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round((n / 1000) * 100) / 100;
}

function normalizeCourse_(raw) {
  const text = String(raw || '').trim();
  if (COURSE_SHEETS.indexOf(text) !== -1) return text;
  const compact = text.toLowerCase().replace(/[\s'’]/g, '');
  if (compact.indexOf('1r') === 0) return "1r d'ESO";
  if (compact.indexOf('2n') === 0) return "2n d'ESO";
  if (compact.indexOf('3r') === 0) return "3r d'ESO";
  if (compact.indexOf('4t') === 0) return "4t d'ESO";
  return null;
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Permet comprovar ràpidament al navegador que l'enllaç .exec està actiu.
 */
function doGet() {
  return jsonResponse_({
    ok: true,
    app: 'CalculaRàpid',
    courses: COURSE_SHEETS,
  });
}

/**
 * Rep les rondes completades per l'alumnat (Content-Type: text/plain per evitar preflight CORS)
 * i les desa al full corresponent al seu curs.
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return jsonResponse_({ ok: false, error: 'Cos de la petició buit.' });
    }
    if (e.postData.contents.length > 8192) {
      return jsonResponse_({ ok: false, error: 'Petició massa gran.' });
    }

    const data = JSON.parse(e.postData.contents);
    const course = normalizeCourse_(data.course);
    if (!course) {
      return jsonResponse_({ ok: false, error: 'Curs no vàlid.' });
    }

    const studentName = sanitizeCellText_(data.studentName, 60);
    if (studentName.length < 2) {
      return jsonResponse_({ ok: false, error: 'Nom d’alumne no vàlid.' });
    }

    const rawGroup = String(data.group || '').trim().toUpperCase();
    const group = VALID_GROUPS.indexOf(rawGroup) !== -1 ? rawGroup : 'A';

    const tierUsed = toInt_(data.tierUsed, 1, 5, 1);
    const tierName = sanitizeCellText_(data.tierName, 30);
    const tierLabel = tierName ? 'Nivell ' + tierUsed + ' (' + tierName + ')' : 'Nivell ' + tierUsed;

    const totalQuestions = toInt_(data.totalQuestions, 1, 100, 10);
    const correctCount = toInt_(data.correctCount, 0, totalQuestions, 0);
    const accuracyPct = Math.round((correctCount / totalQuestions) * 100);

    const indirectTotal = toInt_(data.indirectTotalCount, 0, totalQuestions, 0);
    const indirectCorrect = toInt_(data.indirectCorrectCount, 0, indirectTotal, 0);

    const operations = sanitizeCellText_(data.operations, 60);
    const questionMode = sanitizeCellText_(data.questionMode, 30);
    const avgSeconds = toSeconds_(data.avgResponseTimeMs);
    const bestStreak = toInt_(data.bestStreak, 0, totalQuestions, 0);
    const starsEarned = toInt_(data.starsEarned, 0, 10000, 0);
    const totalStarsEarned = toInt_(data.totalStarsEarned, 0, 1000000, starsEarned);
    const highestTier = toInt_(data.highestUnlockedTier, 1, 5, tierUsed);

    const timestampMs = Number(data.timestamp);
    const recordedAt =
      Number.isFinite(timestampMs) && timestampMs > 0 ? new Date(timestampMs) : new Date();

    lock.waitLock(10000);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ensureCourseSheet_(ss, course);

    sheet.appendRow([
      recordedAt,
      studentName,
      group,
      tierLabel,
      operations,
      questionMode,
      correctCount,
      totalQuestions,
      accuracyPct,
      indirectCorrect + ' / ' + indirectTotal,
      avgSeconds,
      bestStreak,
      starsEarned,
      totalStarsEarned,
      'Nivell ' + highestTier,
    ]);

    const lastRow = sheet.getLastRow();
    sheet.getRange(lastRow, 1).setNumberFormat('dd/MM/yyyy HH:mm:ss');

    return jsonResponse_({
      ok: true,
      sheet: course,
      row: lastRow,
    });
  } catch (err) {
    return jsonResponse_({
      ok: false,
      error: err && err.message ? String(err.message) : 'Error intern',
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (_) {
      // Ignora si el bloqueig no s'havia arribat a adquirir
    }
  }
}
