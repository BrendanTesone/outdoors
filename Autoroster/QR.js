function makeQr() {
  let prompt = SpreadsheetApp.getUi().prompt("Insert Data/link");
  
  if (prompt.getSelectedButton() == SpreadsheetApp.getUi().Button.OK) {
    let link = prompt.getResponseText();
    let imageLink =
      "https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=" + link;
    
    const template = HtmlService.createTemplateFromFile("AutoQRGenSideBar");
    template.link = link; 
    template.imageUrl = imageLink; 
    const htmlOutput = template.evaluate().setTitle("Right Click QR and Copy.");
    SpreadsheetApp.getUi().showSidebar(htmlOutput);
  }
}
