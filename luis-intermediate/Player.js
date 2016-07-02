class Player { // eslint-disable-line no-unused-vars
  playTurn(warrior) {
    // Gather information about surroundings
    const directions = ['forward', 'backward', 'right', 'left'];
    const surroundings = directions.map((direction) => (
      {
        direction,
        space: warrior.feel(direction),
      }
    ));

    const spaceWithEnemy = surroundings.find((surrounding) => (
      surrounding.space.isEnemy()
    ));

    if (spaceWithEnemy) {
      return warrior.attack(spaceWithEnemy.direction);
    }

    // You are dying! Rest a bit!
    if (warrior.health() < 15) {
      return warrior.rest();
    }

    return warrior.walk(warrior.directionOfStairs());
  }
}
