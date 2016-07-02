'use strict';

// Constants
const FULL_HEALTH = 20;
const FORWARD = 'forward';
const BACKWARD = 'backward';
const RIGHT = 'right';
const LEFT = 'left';
const DIRECTIONS = [FORWARD, BACKWARD, RIGHT, LEFT];

// States
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
  return warrior.health() < (FULL_HEALTH * 0.5);
}

function shouldRest(warrior) {
  const remainingEnemy = warrior.listen()
    .find((occupiedSpace) => occupiedSpace.isEnemy());

  return !!remainingEnemy && (warrior.health() < FULL_HEALTH * 0.90);
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
          const bailDirection = emptySurroundings.pop().direction;
          bailPath.push(bailDirection);
          return warrior.walk(bailDirection);
        }
      }

      // Attack
      return warrior.attack(enemySurroundings.pop().direction);
    }

    // Can't feel any enemy
    if (!enemySurroundings.length && shouldRest(warrior)) {
      // It's safe to rest now. I'll just sit here.
      return warrior.rest();
    }

    // WAIT! Was I running away from something? I should go back and fight!
    if (bailPath.length) {
      return warrior.walk(getReverseDirection(bailPath.pop()));
    }

    // Shhh... is there something else in this room?
    const occupiedSpaces = warrior.listen();
    if (occupiedSpaces.length) {
      return warrior.walk(warrior.directionOf(occupiedSpaces.pop()));
    }

    // My job here is done. Let's get out.
    return warrior.walk(warrior.directionOfStairs());
  }
}
