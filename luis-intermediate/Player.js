'use strict';

// Constants
const ENEMIES = 3;
const MINIMUM_ACCEPTABLE_HEALTH = 10;
const FORWARD = 'forward';
const BACKWARD = 'backward';
const RIGHT = 'right';
const LEFT = 'left';
const DIRECTIONS = ['forward', 'backward', 'right', 'left'];

// States
let enemiesKilled = 0;
let attackingDirection;
let previouslyAttackingDirection;
const bailPath = [];

function filterSurroundings(surroundings, filter) {
  return surroundings.filter((surrounding) => (
    surrounding.space[`is${filter}`]()
  ));
}

function feelSurroundings(warrior) {
  return DIRECTIONS.map((direction) => (
    {
      direction,
      space: warrior.feel(direction),
    }
  ));
}

function isTooRisky(warrior) {
  return warrior.health() < MINIMUM_ACCEPTABLE_HEALTH;
}

function getReverseDirection(direction) {
  let reverseDirection;

  switch (direction) {
    case FORWARD:
      reverseDirection = BACKWARD;
      break;
    case BACKWARD:
      reverseDirection = FORWARD;
      break;
    case LEFT:
      reverseDirection = RIGHT;
      break;
    default:
      reverseDirection = LEFT;
  }

  return reverseDirection;
}

class Player { // eslint-disable-line no-unused-vars
  playTurn(warrior) {
    const surroundings = feelSurroundings(warrior);
    const enemySurroundings = filterSurroundings(surroundings, 'Enemy');
    const captiveSurroundings = filterSurroundings(surroundings, 'Captive');
    const emptySurroundings = filterSurroundings(surroundings, 'Empty');

    // Right things first!
    if (captiveSurroundings.length) {
      return warrior.rescue(captiveSurroundings.pop().direction);
    }

    if (enemySurroundings.length) {
      if (isTooRisky(warrior)) {
        // Try to bail out!
        if (emptySurroundings) {
          previouslyAttackingDirection = undefined; // Attack was cancelled
          const bailDirection = emptySurroundings.pop().direction;
          bailPath.push(bailDirection);
          return warrior.walk(bailDirection);
        }
      }

      // Attack
      attackingDirection = enemySurroundings.pop().direction;

      if (previouslyAttackingDirection &&
          (attackingDirection !== previouslyAttackingDirection)) {
        // Seems like I changed my objective. Did I kill the previous guy?
        enemiesKilled++;
      }

      // My fish-memory should remember this
      previouslyAttackingDirection = attackingDirection;

      return warrior.attack(attackingDirection);
    }

    // Can't feel any enemy
    if (!enemySurroundings.length) {
      if (previouslyAttackingDirection) {
        // But I was just attacking one... I must have killed him *shrug*
        previouslyAttackingDirection = undefined;
        enemiesKilled++;
        console.log(`Enemy killed! (${enemiesKilled} out of ${ENEMIES})`);
      }

      // I remember now! I was running. I will just sit here!
      if (isTooRisky(warrior) && (enemiesKilled < ENEMIES)) {
        return warrior.rest();
      }
    }

    // WAIT! Was I running away from something? I should fight!
    if (bailPath.length) {
      return warrior.walk(getReverseDirection(bailPath.pop()));
    }

    return warrior.walk(warrior.directionOfStairs());
  }
}
