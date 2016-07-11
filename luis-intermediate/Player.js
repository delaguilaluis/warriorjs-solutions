'use strict';

// Constants
const FULL_HEALTH = 20;
const FORWARD = 'forward';
const BACKWARD = 'backward';
const RIGHT = 'right';
const LEFT = 'left';
const DIRECTIONS = [FORWARD, BACKWARD, RIGHT, LEFT];

// States
const breadCrumbs = [];
const boundDirections = [];

/** Feel surrounding spaces (up to 1) **/
function feelSurroundings(warrior) {
  return DIRECTIONS.map(direction => ({
    direction,
    space: warrior.feel(direction),
  }));
}

/** Look surrounding spaces (up to 3) **/
function lookSurroundings(warrior) {
  return DIRECTIONS.reduce((accumulator, direction) => (
    accumulator.concat(
      warrior.look(direction).map(space => ({
        direction,
        space,
        distance: warrior.distanceOf(space),
      }))
    )
  ), []);
}

function filterSurroundings(surroundings, filter) {
  return surroundings.filter(surrounding => (
    surrounding.space[`is${filter}`]()
  ));
}

/** To be used as a reduce callback **/
function augmentSurroundings(accumulator, surrounding) {
  // Search for accumulated surroundings in the same direction
  const existingDirectionIndex = accumulator.findIndex(existingSurrounding => (
    existingSurrounding.direction === surrounding.direction
  ));

  const newSurrounding = Object.create(surrounding);

  if (existingDirectionIndex !== -1) {
    // On existing directions: do increment and remove the previous element
    newSurrounding.findCount = accumulator[existingDirectionIndex].findCount + 1;
    accumulator.splice(existingDirectionIndex, 1);
  } else {
    newSurrounding.findCount = 1;
  }

  return accumulator.concat(newSurrounding);
}

/**
*   Reduces an array of surroundings by direction
*   and sorts it by number of ocurrences
**/
function makeSortedSurroundings(surroundings) {
  const surroundingDetails = surroundings.reduce(augmentSurroundings, []);
  return surroundingDetails.sort((a, b) => a.findCount - b.findCount);
}

/** Check if the warrior's heath is to low **/
function isTooRisky(warrior) {
  return warrior.health() < (FULL_HEALTH * 0.25);
}

function shouldRest(warrior) {
  const occupiedSpaces = warrior.listen();
  const remainingEnemy = occupiedSpaces.find(
    occupiedSpace => occupiedSpace.isEnemy()
  );
  const tickingCaptive = occupiedSpaces.find(
    occupiedSpace => occupiedSpace.isTicking()
  );

  const healthFactor = tickingCaptive ? 0.75 : 0.9;
  return !!remainingEnemy && (warrior.health() < (FULL_HEALTH * healthFactor));
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

/** Avoid the stairs direction, go to the following empty one **/
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
  const alternativeSurrounding = surroundings.find(surrounding => (
    surrounding.direction !== desiredDirection &&
      surrounding.direction !== breadCrumbs.slice(0).pop() &&
      surrounding.space.isEmpty()
  ));

  return alternativeSurrounding && alternativeSurrounding.direction;
}

class Player { // eslint-disable-line no-unused-vars
  playTurn(warrior) {
    // Extend walk to forget about bound directions
    const superWalk = warrior.walk;
    warrior.walk = (direction) => { // eslint-disable-line no-param-reassign
      breadCrumbs.push(getReverseDirection(direction));
      boundDirections.splice(0);
      superWalk(direction);
    };

    const surroundings = feelSurroundings(warrior);

    // Let's check if there's a captive next to me that I could rescue
    const captiveSurroundings = filterSurroundings(surroundings, 'Captive');
    if (captiveSurroundings.length) {
      // Is this a captive enemy?
      const rescueDirection = captiveSurroundings.slice(0).pop().direction;
      if (!boundDirections.find(direction => direction === rescueDirection)) {
        return warrior.rescue(rescueDirection);
      }
    }

    // Should I rest or continue?
    const enemySurroundings = filterSurroundings(surroundings, 'Enemy');
    const existNearbyEnemies = !!enemySurroundings.length;
    if (!existNearbyEnemies && shouldRest(warrior)) {
      return warrior.rest();
    }

    // Let's go to the ticking captive
    const occupiedSpaces = warrior.listen();
    const tickingSpaces = occupiedSpaces.filter(space => space.isTicking());
    const isSomethingTicking = !!tickingSpaces.length;
    if (isSomethingTicking) {
      const desiredDirection = warrior.directionOf(tickingSpaces.slice(0).pop());
      const rightDirection = getRightDirection(surroundings, desiredDirection);
      if (rightDirection) {
        return warrior.walk(rightDirection);
      }
    }

    // OK, it's time to fight. Is anyone next to me?
    if (existNearbyEnemies || boundDirections.length) {
      if (isTooRisky(warrior)) {
        // Try to bail out!
        const emptySurroundings = filterSurroundings(surroundings, 'Empty');
        if (emptySurroundings.length) {
          const bailDirection = emptySurroundings.slice(0).pop().direction;
          return warrior.walk(bailDirection);
        }
      }

      // Attack
      const enemiesOnSight = filterSurroundings(lookSurroundings(warrior), 'Enemy');
      const sortedEnemySurroundings = makeSortedSurroundings(enemiesOnSight);

      if (sortedEnemySurroundings.length > 1) {
        // I'm being mobbed! Let's bind on the emptier direction
        const bindDirection = sortedEnemySurroundings.shift().direction;
        boundDirections.push(bindDirection);
        return warrior.bind(bindDirection);
      }

      const attackDirection = sortedEnemySurroundings.slice(0).pop().direction;
      const enemiesAhead = warrior.look(attackDirection)
        .filter(space => space.isEnemy());

      // Is it worth to make an explotion here?
      if ((enemiesAhead.length > 1) && !isTooRisky(warrior) && isSomethingTicking
          && !tickingSpaces.find(space => warrior.distanceOf(space) < 3)) {
        return warrior.detonate(attackDirection);
      }

      if (enemySurroundings.length) {
        return warrior.attack(attackDirection);
      }

      // No enemies nearby? I most have bound a guy
      return warrior.attack(boundDirections.pop());
    }

    // Shhh... is there something else in this room?
    if (occupiedSpaces.length) {
      const desiredDirection = warrior.directionOf(occupiedSpaces.slice(0).pop());
      const rightDirection = getRightDirection(surroundings, desiredDirection);
      return warrior.walk(rightDirection);
    }

    // My job here is done. Let's get out.
    return warrior.walk(warrior.directionOfStairs());
  }
}
