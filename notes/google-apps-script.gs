const SPREADSHEET_ID="1_jnKxCrPVYFMMhFFJZK5tD09X1DM5Xj0Lu_GnMacnCY";
const SHEET_NAME="Notes";

function getSheet(){
  const ss=SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet=ss.getSheetByName(SHEET_NAME);
  if(!sheet) sheet=ss.insertSheet(SHEET_NAME);
  if(sheet.getLastRow()===0) sheet.appendRow(["ID","Title","Content","Created","Updated"]);
  return sheet;
}

function doGet(e){
  const action=e.parameter.action||"load";
  if(action!=="load") return output({ok:false,error:"Unknown action"});
  const sheet=getSheet();
  const values=sheet.getDataRange().getValues();
  const notes=[];
  for(let i=1;i<values.length;i++){
    if(!values[i][0]) continue;
    notes.push({
      id:String(values[i][0]),
      title:String(values[i][1]||"Untitled Note"),
      content:String(values[i][2]||""),
      created:Number(values[i][3])||Date.now(),
      updated:Number(values[i][4])||Date.now()
    });
  }
  notes.sort((a,b)=>b.updated-a.updated);
  const json=JSON.stringify(notes);
  if(e.parameter.callback){
    return ContentService.createTextOutput(e.parameter.callback+"("+json+")").setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e){
  try{
    const action=e.parameter.action||"save";
    if(action!=="save") return output({ok:false,error:"Unknown action"});
    const notes=JSON.parse(e.parameter.data||"[]");
    const sheet=getSheet();
    const lastRow=sheet.getLastRow();
    if(lastRow>1) sheet.getRange(2,1,lastRow-1,5).clearContent();
    if(Array.isArray(notes)&&notes.length){
      const rows=notes.map(n=>[
        String(n.id||Utilities.getUuid()),
        String(n.title||"Untitled Note"),
        String(n.content||""),
        Number(n.created)||Date.now(),
        Number(n.updated)||Date.now()
      ]);
      sheet.getRange(2,1,rows.length,5).setValues(rows);
    }
    return output({ok:true,count:Array.isArray(notes)?notes.length:0});
  }catch(err){
    return output({ok:false,error:String(err)});
  }
}

function output(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}