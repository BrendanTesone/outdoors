class genderSheetHandler {
    static readFromSheet() {
        const spreadsheet = SpreadsheetApp.openByUrl(Links.genderSheetLink);
        const sheet = spreadsheet.getSheets()[0];
        const values = sheet.getDataRange().getValues().slice(1); 
        const removeBlanks = values.filter(row=>{
          return row[0] && row[1] && row[2];
        })
        const people = removeBlanks.map(row => {
          return new Person(
            row[1], // name
            row[0], // email
            null,   // priority
            null,   // isDriver
            null,   // isEboard
            null,   // submissionDateAndTime
            null,   // rosterState
            row[2]  // gender
          );
        });

        return people;
    }
  
    static writeToSheet(peopleArray) {
        const existingPeople = genderSheetHandler.readFromSheet();
        const existingEmails = new Set(existingPeople.map(p => p.email));
  
        const newPeople = peopleArray.filter(person => !existingEmails.has(person.email) && person.gender !== null);
  
        if (!newPeople) {
          return;
        }

        const rowsToAdd = newPeople.map(p => [
          p.email, p.name, p.gender
        ]);
  
        const spreadsheet = SpreadsheetApp.openByUrl(Links.genderSheetLink);
        const sheet = spreadsheet.getSheets()[0];
  
        sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAdd.length, rowsToAdd[0].length).setValues(rowsToAdd); //Finds first empty row, not optimal as manual intervention could mean an empty row in between entries
    }
  
    static genderizeWithApi(persons) {
      const url = 'https://v2.namsor.com/NamSorAPIv2/api2/json/genderFullBatch';
      
      const apiKey = '6b8fa7c4cf645e503c84506034caa8c7';

      const personalNames = persons.map(person => ({
        name: person.name,
        id: person.email
      }));
      
      const payload = {
        personalNames: personalNames
      };
      
      const options = {
        method: 'POST',
        headers: {
          'X-API-KEY': apiKey,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        payload: JSON.stringify(payload)
      };
      
      const response = UrlFetchApp.fetch(url, options);
      
      const data = JSON.parse(response.getContentText());
      const outputNames = data.personalNames || [];
      
      const people = outputNames.map(person => {
        return new Person(person.name, person.id, null, null, null, null, null, person.likelyGender)
      });

      return people;
    }
  
    static genderizeFromSheetAndAPI(peopleArray) {
        const knownPeople = genderSheetHandler.readFromSheet();
        const peopleToGenderize = peopleArray.filter(person => !knownPeople.some(genderedPerson=> person.email === genderedPerson.email))

        if (peopleToGenderize.length !== 0) {
          const newlyGenderizedPeople = genderSheetHandler.genderizeWithApi(peopleToGenderize);
          genderSheetHandler.writeToSheet(newlyGenderizedPeople);
        }

        const newGenderedPeople = genderSheetHandler.readFromSheet();

        const finalArray = peopleArray.map(person => {
            const genderedObject = newGenderedPeople.find(genderedPerson => person.email === genderedPerson.email);
            return new Person(
              person.name, person.email, person.priority, person.isDriver,
              person.isEboard, person.submissionDateAndTime, person.rosterState,
              genderedObject ? genderedObject.gender : null
            );
        });

        return finalArray;
      }
  }
  
