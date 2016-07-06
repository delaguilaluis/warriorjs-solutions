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

function feelSurroundings(warrior) {
  return DIRECTIONS.map(direction => (
    {
      direction,
      space: warrior.feel(direction),
    }
  ));
}

function filterSurroundings(surroundings, filter) {
  return surroundings.filter(surrounding => (
    surrounding.space[`is${filter}`]()
  ));
}

function isTooRisky(warrior) {
  return warrior.health() < (FULL_HEALTH * 0.5);
}

function shouldRest(warrior) {
  const remainingEnemy = warrior.listen()
    .find(occupiedSpace => occupiedSpace.isEnemy());

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

function getRightDirection(surroundings, desiredDirection) {
  const desiredSurrounding = surroundings.find(surrounding => (
    surrounding.direction === desiredDirection &&
      surrounding.space.isEmpty() &&
      !surrounding.space.isStairs() // Stairs are 'empty' spaces too o.O
  ));

  if (desiredSurrounding) {
    return desiredDirection;
  }

  // The desired direction is not a good idea, let's try another path
  return surroundings.find(surrounding => (
      surrounding.direction !== desiredDirection &&
        surrounding.direction !== getReverseDirection(desiredDirection) &&
        surrounding.space.isEmpty()
    ))
    .direction;
}

class Player { // eslint-disable-line no-unused-vars
  playTurn(warrior) {
    const surroundings = feelSurroundings(warrior);

    // Let's check if there's a captive next to me that I could rescue
    const captiveSurroundings = filterSurroundings(surroundings, 'Captive');
    if (captiveSurroundings.length) {
      return warrior.rescue(captiveSurroundings.pop().direction);
    }

    // Is there someone about to blow everything up?
    const occupiedSpaces = warrior.listen();
    const tickingSpaces = occupiedSpaces.filter(space => space.isTicking());
    if (tickingSpaces.length) {
      const desiredDirection = warrior.directionOf(tickingSpaces.pop());
      const rightDirection = getRightDirection(surroundings, desiredDirection);
      return warrior.walk(rightDirection);
    }

    // OK, we're safe, let's see if I can fight a guy next to me
    const enemySurroundings = filterSurroundings(surroundings, 'Enemy');
    if (enemySurroundings.length) {
      if (isTooRisky(warrior)) {
        // Try to bail out!
        const emptySurroundings = filterSurroundings(surroundings, 'Empty');
        if (emptySurroundings) {
          const bailDirection = emptySurroundings.pop().direction;
          bailPath.push(bailDirection);
          return warrior.walk(bailDirection);
        }
      }

      // Attack
      return warrior.attack(enemySurroundings.pop().direction);
    }

    // Can't feel any enemy nearby. Should I rest or continue?
    if (shouldRest(warrior)) {
      return warrior.rest();
    }

    // WAIT! Was I running away? If so, I should go back and fight!
    if (bailPath.length) {
      return warrior.walk(getReverseDirection(bailPath.pop()));
    }

    // Shhh... is there something else in this room?
    if (occupiedSpaces.length) {
      const desiredDirection = warrior.directionOf(occupiedSpaces.pop());
      const rightDirection = getRightDirection(surroundings, desiredDirection);
      return warrior.walk(rightDirection);
    }

    // My job here is done. Let's get out.
    return warrior.walk(warrior.directionOfStairs());
  }
}
