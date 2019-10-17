const faker = require('faker')

// function to valide if all array items are true
const isASuccesfullAttemp = array => array.reduce((acc, val) => acc && val, true)
// function that retreive a array from length, filled  with true values
const getSuccessfullAttemp = nTestCases => Array.from(Array(nTestCases), () => true)
// function to retreive a random boolean
const getRandomBoolean = () => faker.random.boolean()
// Function to retreive a random boolean array
const getArrayOfBooleans = nTestCases => Array.from(Array(nTestCases), getRandomBoolean)
// function that returns true if val is true, else return a random boolean
const tryToSetFalseToTrue = val => val ? val : faker.random.boolean()
// this function gets an array of boolean values, and try to set the falsy values to true aleatory
const upgradeRandomBooleans = arrayOfbooleanValues => arrayOfbooleanValues.map(tryToSetFalseToTrue)
// function to retreive the last array 
const getLast = a => a[a.length - 1]
// function to get aleatory array of attemps to solve a test cases of a project
const getArrayOfAttempsByStudent = student => {
  const firstAttemp = getArrayOfBooleans(nTestCases)
  const attemps = [firstAttemp]
  let lastAttemp = firstAttemp
  for (let i = 0; i < maxStudentAttemps - 1; i++) {
    const lastAttempInArray = getLast(attemps)
    if (isASuccesfullAttemp(lastAttempInArray)) return attemps;
    const newAttemp = upgradeRandomBooleans(lastAttempInArray)
    lastAttemp = newAttemp
    attemps.push(newAttemp)
  }

  const hasStudentPassed = isASuccesfullAttemp(lastAttemp)
  if (hasStudentPassed) return attemps

  const randomNumber = faker.random.number({ min: 1, max: 10 })
  const shouldTheStudentPass = randomNumber > 7
  if (shouldTheStudentPass) attemps[attemps.length - 1] = getSuccessfullAttemp(nTestCases)

  return attemps

}

const nTestCases = 5
const maxStudentAttemps = 10
const students = Array.from(Array(1), (v, i) => i)
const attempsStudent = students.map(getArrayOfAttempsByStudent)

console.log(attempsStudent)





// console.log('[ ' + first.join(','), '] approved?', isASuccesfullAttemp(first))
// console.log('[ ' + second.join(','), '] approved?', isASuccesfullAttemp(second))
// console.log('[ ' + thirth.join(','), '] approved?', isASuccesfullAttemp(thirth))
// console.log('[ ' + fourth.join(','), '] approved?', isASuccesfullAttemp(fourth))
// console.log('[ ' + fifth.join(','), '] approved?', isASuccesfullAttemp(fifth))  