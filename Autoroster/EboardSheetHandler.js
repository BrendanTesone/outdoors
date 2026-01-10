class EboardSheet {
  static getEboardMembers() {
    const cachedEboardMembers = PropHandler.cachedEboardMembers;

    if (cachedEboardMembers) {
      return cachedEboardMembers;
    }

    const externalSpreadsheet = SpreadsheetApp.openByUrl(Links.eboardSheetLink);
    const externalSheet = externalSpreadsheet.getSheets()[0];
    let data = externalSheet
      .getRange("A2:B" + externalSheet.getLastRow())
      .getValues();
    data = data.filter((row) => row[0].trim() !== "" && row[1].trim() !== "");
    const people = [];
    data.forEach((rawEboardMember) => {
      const name = rawEboardMember[0].toString().trim();
      const email = rawEboardMember[1].toString().toLowerCase().trim();
      const person = new Person(name, email, null, null, true, null, null);
      people.push(person);
    });

    PropHandler.cachedEboardMembers = people;

    return people;
  }

  static isEboard(email) {
    const data = this.getEboardMembers();
    const rowIndex = data.findIndex((row) => row.email === email);
    const isFound = rowIndex !== -1;
    return isFound;
  }
}
