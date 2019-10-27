const { describe, it } = require('mocha')
const chai = require('chai')
const chaiArrays = require('chai-arrays')
const utils = require('./..')
chai.use(chaiArrays)
chai.should()

/**
 * Test timer 
 * 
 * @param {int} time Time to test in ms
 * @param {*} tolerance Tolerence in ms
 */
function testTimer(time, tolerance) {
  return new Promise((resolve, reject) => {
    utils.timer.start('test' + time.toString())
    setTimeout(() => {
      const result = utils.timer.getTime('test' + time.toString())
      result.should.to.be.a('string')
      parseFloat(result).should.to.be.within(time, time + tolerance)

      resolve()
    }, time)
  })
}

/**
 * Test timer with 10ms 1s and 10s
 */
describe('Timer', function() {
  it ('test 10ms 1s and 10s', async function () {
    this.timeout(12000)
    await testTimer(10, 2)
    await testTimer(1000, 5)
    await testTimer(10000, 15)
  })
})
