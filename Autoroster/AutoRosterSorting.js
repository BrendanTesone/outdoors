function getSortedAndProcessedData() {
    const commitmentFormPeople = CommitmentForm.grabPeople();
  const rosteredPeople = RosterSheet.getRosterizedPeople(
    false,
    false,
    false,
    false
  );
  rosteredPeople.forEach((person)=>{
    person.rosterState = RosterStates.Rostered;
  })

  const commitmentFormPeopleWithoutRosteredPeople = commitmentFormPeople.filter((commitmentPerson) =>{
    return !rosteredPeople.some((rosteredPerson) => rosteredPerson.email === commitmentPerson.email)
  }).map((person) => {
      return { ...person, isDriver: false };
    });

  const combinedCommitmentAndRoster = [...rosteredPeople,...commitmentFormPeopleWithoutRosteredPeople]

  const oldsort = oldSortNoGender(combinedCommitmentAndRoster);

  return oldsort;
  // const commitmentFormPeople = CommitmentForm.grabPeople();
  // const rosteredPeople = RosterSheet.getRosterizedPeople(
  //   false,
  //   false,
  //   false,
  //   false
  // );
  // rosteredPeople.forEach((person)=>{
  //   person.rosterState = RosterStates.Rostered;
  // })

  // const commitmentFormPeopleWithoutRosteredPeople = commitmentFormPeople.filter((commitmentPerson) =>{
  //   return !rosteredPeople.some((rosteredPerson) => rosteredPerson.email === commitmentPerson.email)
  // }).map((person) => {
  //     return { ...person, isDriver: false };
  //   });

  // const combinedCommitmentAndRoster = [...rosteredPeople,...commitmentFormPeopleWithoutRosteredPeople]

  // const combinedCommitmentAndRosterGendered = genderSheetHandler.genderizeFromSheetAndAPI(combinedCommitmentAndRoster);

  // const oldSortNoGenderPeople = oldSortNoGender(combinedCommitmentAndRosterGendered)

  // const percentOldSortFemale = calculatePercentFemaleRostered(oldSortNoGenderPeople);
  // if(percentOldSortFemale === null){
  //   return oldSortNoGenderPeople;
  // }

  // const nonInterfereSort = newSortGenderNoPriorityInterference(combinedCommitmentAndRosterGendered);
  // const nonInterfereFemalePercent = calculatePercentFemaleRostered(nonInterfereSort)

  // const interfereSort = newSortGenderPriorityInterference(combinedCommitmentAndRosterGendered);
  // const intefereFemalePercent = calculatePercentFemaleRostered(interfereSort)

  // const priorityLost = nonInterfereSort.filter(person => person.priority > 0 && !interfereSort.some(interferePerson => interferePerson.email === person.email)).length;    
  // const ui = SpreadsheetApp.getUi();
  //   const response = ui.alert(
  //     'Even out gender ratio on roster?',
  //     `Yes: Balance gender to achieve a ${intefereFemalePercent.toFixed(1)}% female roster. This will cause ${priorityLost} high-priority people to lose their spots.\nNo: Prioritize applicants by priority first. The roster will be ${nonInterfereFemalePercent.toFixed(1)}% female.`,
  //     ui.ButtonSet.YES_NO
  //   );
  //   if (response === ui.Button.YES) {
  //     return interfereSort;
  //   } else {
  //     return nonInterfereSort;
  //   }
}

const calculatePercentFemaleRostered = (people) => {
  let numMale = 0;
  let numFemale = 0;
  const rosteredPeople = people.filter(person => person.rosterState === RosterStates.Rostered)
  rosteredPeople.forEach(person => {
      if(person.gender === "male"){
        numMale++;
      }else if(person.gender === "female"){
        numFemale++;
      } else {
        return null; //some not male or female
      }
  });

  return (numFemale / rosteredPeople.length) * 100;
}

const calculatePercentFemaleAll = (people) => {
  let numMale = 0;
  let numFemale = 0;
  people.forEach(person => {
      if(person.gender === "male"){
        numMale++;
      }else if(person.gender === "female"){
        numFemale++;
      } else {
        return null; //some not male or female
      }
  });

  return (numFemale / people.length) * 100;
}

const oldSortNoGender = (genderizedCombinedParam) =>{
  const genderizedCombined = JSON.parse(JSON.stringify(genderizedCombinedParam))
  const genderizedCommitment = genderizedCombined.filter(person => person.rosterState !== RosterStates.Rostered)
  const genderizedRostered = genderizedCombined.filter(person => person.rosterState === RosterStates.Rostered)

  const sortedList = genderizedCommitment.sort(
    (a, b) =>
      b.priority - a.priority || // Sort by highest priority first
      new Date(a.submissionDateAndTime) - new Date(b.submissionDateAndTime) // If same priority, sort by earliest submission time
  );
  
  let expectedRosterCount = PropHandler.numRostered;
  let numWaitlist = PropHandler.numWaitlist;
  let numRostered = RosterSheet.countPeopleOnRosterSheet();
  let maxToBeAddedAsRostered = expectedRosterCount - numRostered;

  //assign roster states based on the sorted list
  sortedList.forEach((person, index) => {
    if (index < maxToBeAddedAsRostered) {
      person.rosterState = RosterStates.Rostered;
    } else if (index < maxToBeAddedAsRostered + numWaitlist) {
      person.rosterState = RosterStates.Waitlisted;
    } else {
      person.rosterState = RosterStates.Rejected;
    }
  });

  return [...genderizedRostered, ...sortedList];
}

const newSortGenderNoPriorityInterference = (genderizedCombinedParam) => {
  const genderizedCombined = JSON.parse(JSON.stringify(genderizedCombinedParam))
  const genderizedCommitment = genderizedCombined.filter(person => person.rosterState !== RosterStates.Rostered)
  const genderizedRostered = genderizedCombined.filter(person => person.rosterState === RosterStates.Rostered)
  
  const buckets = new Map();
  genderizedCommitment.forEach(person => {
    if (!buckets.has(person.priority)) {
        buckets.set(person.priority, []);
    }
    buckets.get(person.priority).push(person);
  });
  const priorities = Array.from(buckets.keys()).sort((a, b) => b - a);

  const newPeopleList = [];
  priorities.forEach(priority => {
    const people = buckets.get(priority);
    //TODO: make this a loop that still balances females, more complicated, catch is that this could bring a higher percent than the other one lol
    const priorityList = [];
    
    const priorityFemaleList = people.filter(person => {return person.gender === "female"}).sort(
      (a, b) =>
        new Date(a.submissionDateAndTime) - new Date(b.submissionDateAndTime) // If same priority, sort by earliest submission time
    );
    const priorityMaleList = people.filter(person => {return person.gender === "male"}).sort(
      (a, b) =>
        new Date(a.submissionDateAndTime) - new Date(b.submissionDateAndTime) // If same priority, sort by earliest submission time
    );

    let maleIndex = 0;
    let femaleIndex = 0;

    // Continue iterating as long as there are people in either list
    while (maleIndex < priorityMaleList.length || femaleIndex < priorityFemaleList.length) {
      const femaleRatio = calculatePercentFemaleAll([...genderizedRostered, ...newPeopleList]);

      // If female ratio is < 50% and females are available, add a female
      if (femaleRatio < 53 && femaleIndex < priorityFemaleList.length) {
        newPeopleList.push(priorityFemaleList[femaleIndex]);
        femaleIndex++;
      } 
      // Otherwise, add a male if males are available
      else if (maleIndex < priorityMaleList.length) {
        newPeopleList.push(priorityMaleList[maleIndex]);
        maleIndex++;
      } 
      // If no males left, add a female
      else if (femaleIndex < priorityFemaleList.length) {
        newPeopleList.push(priorityFemaleList[femaleIndex]);
        femaleIndex++;
      }
    }
  });

  
  
  let expectedRosterCount = PropHandler.numRostered;
  let numWaitlist = PropHandler.numWaitlist;
  let numRostered = RosterSheet.countPeopleOnRosterSheet();
  let maxToBeAddedAsRostered = expectedRosterCount - numRostered;

  //assign roster states based on the sorted list
  newPeopleList.forEach((person, index) => {
    if (index < maxToBeAddedAsRostered) {
      person.rosterState = RosterStates.Rostered;
    } else if (index < maxToBeAddedAsRostered + numWaitlist) {
      person.rosterState = RosterStates.Waitlisted;
    } else {
      person.rosterState = RosterStates.Rejected;
    }
  });

  return [...genderizedRostered, ...newPeopleList];
}

const newSortGenderPriorityInterference = (genderizedCombinedParam) => {
  const genderizedCombined = JSON.parse(JSON.stringify(genderizedCombinedParam))
  const genderizedCommitment = genderizedCombined.filter(person => person.rosterState !== RosterStates.Rostered)
  const genderizedRostered = genderizedCombined.filter(person => person.rosterState === RosterStates.Rostered)


  const priorityFemaleList = genderizedCommitment.filter(person => {return person.gender === "female"}).sort(
    (a, b) =>
      b.priority - a.priority || // 1. Sort by highest priority first
      new Date(a.submissionDateAndTime) - new Date(b.submissionDateAndTime) // 3. Finally, sort by earliest submission time
  );
  const priorityMaleList = genderizedCommitment.filter(person => {return person.gender === "male"}).sort(
    (a, b) =>
      b.priority - a.priority || // 1. Sort by highest priority first
      new Date(a.submissionDateAndTime) - new Date(b.submissionDateAndTime) // 3. Finally, sort by earliest submission time
  );

  const newPeopleList = [];
  let maleIndex = 0;
  let femaleIndex = 0;

  // Continue iterating as long as there are people in either list
  while (maleIndex < priorityMaleList.length || femaleIndex < priorityFemaleList.length) {
    const femaleRatio = calculatePercentFemaleAll([...genderizedRostered, ...newPeopleList]);

    // If female ratio is < 50% and females are available, add a female
    if (femaleRatio < 53 && femaleIndex < priorityFemaleList.length) {
      newPeopleList.push(priorityFemaleList[femaleIndex]);
      femaleIndex++;
    } 
    // Otherwise, add a male if males are available
    else if (maleIndex < priorityMaleList.length) {
      newPeopleList.push(priorityMaleList[maleIndex]);
      maleIndex++;
    } 
    // If no males left, add a female
    else if (femaleIndex < priorityFemaleList.length) {
      newPeopleList.push(priorityFemaleList[femaleIndex]);
      femaleIndex++;
    }
  }
  
  let expectedRosterCount = PropHandler.numRostered;
  let numWaitlist = PropHandler.numWaitlist;
  let numRostered = RosterSheet.countPeopleOnRosterSheet();
  let maxToBeAddedAsRostered = expectedRosterCount - numRostered;

  //assign roster states based on the sorted list
  newPeopleList.forEach((person, index) => {
    if (index < maxToBeAddedAsRostered) {
      person.rosterState = RosterStates.Rostered;
    } else if (index < maxToBeAddedAsRostered + numWaitlist) {
      person.rosterState = RosterStates.Waitlisted;
    } else {
      person.rosterState = RosterStates.Rejected;
    }
  });

  return [...genderizedRostered, ...newPeopleList];
}