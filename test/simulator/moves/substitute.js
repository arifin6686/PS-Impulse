'use strict';

const assert = require('./../../assert');
const common = require('./../../common');

let battle;

describe('Substitute', function () {
	afterEach(function () {
		battle.destroy();
	});

	it('should deduct 25% of max HP, rounded down', function () {
		battle = common.createBattle();
		battle.join('p1', 'Guest 1', 1, [{species: 'Mewtwo', ability: 'pressure', moves: ['substitute']}]);
		battle.join('p2', 'Guest 2', 1, [{species: 'Mewtwo', ability: 'pressure', moves: ['recover']}]);
		battle.makeChoices('move substitute', 'move recover');
		let pokemon = battle.p1.active[0];
		assert.strictEqual(pokemon.maxhp - pokemon.hp, Math.floor(pokemon.maxhp / 4));
	});

	it('should not block the user\'s own moves from targetting itself', function () {
		battle = common.createBattle();
		battle.join('p1', 'Guest 1', 1, [{species: 'Mewtwo', ability: 'pressure', moves: ['substitute', 'calmmind']}]);
		battle.join('p2', 'Guest 2', 1, [{species: 'Mewtwo', ability: 'pressure', moves: ['recover']}]);
		battle.makeChoices('move substitute', 'move recover');
		battle.makeChoices('move calmmind', 'move recover');
		assert.strictEqual(battle.p1.active[0].boosts['spa'], 1);
		assert.strictEqual(battle.p1.active[0].boosts['spd'], 1);
	});

	it('should block damage from most moves', function () {
		battle = common.createBattle();
		battle.join('p1', 'Guest 1', 1, [{species: 'Mewtwo', ability: 'pressure', moves: ['substitute']}]);
		battle.join('p2', 'Guest 2', 1, [{species: 'Mewtwo', ability: 'pressure', item: 'laggingtail', moves: ['psystrike']}]);
		battle.makeChoices('move substitute', 'move psystrike');
		let pokemon = battle.p1.active[0];
		assert.strictEqual(pokemon.maxhp - pokemon.hp, Math.floor(pokemon.maxhp / 4));
	});

	it('should not block recoil damage', function () {
		battle = common.createBattle();
		battle.join('p1', 'Guest 1', 1, [{species: 'Mewtwo', ability: 'pressure', moves: ['substitute', 'doubleedge']}]);
		battle.join('p2', 'Guest 2', 1, [{species: 'Mewtwo', ability: 'pressure', moves: ['nastyplot']}]);
		battle.makeChoices('move substitute', 'move nastyplot');
		battle.makeChoices('move doubleedge', 'move nastyplot');
		let pokemon = battle.p1.active[0];
		assert.notStrictEqual(pokemon.maxhp - pokemon.hp, Math.floor(pokemon.maxhp / 4));
	});

	it('should take specific recoil damage in Gen 1', function () {
		battle = common.gen(1).createBattle({seed: [0, 1, 0, 1]});
		battle.join('p1', 'Guest 1', 1, [{species: 'Hitmonlee', moves: ['substitute', 'highjumpkick']}]);
		battle.join('p2', 'Guest 2', 1, [{species: 'Hitmonchan', moves: ['substitute', 'agility']}]);
		battle.makeChoices('move substitute', 'move substitute');

		let subhp = battle.p1.active[0].volatiles['substitute'].hp;
		assert.strictEqual(subhp, battle.p2.active[0].volatiles['substitute'].hp);

		battle.resetRNG(); // Make Hi Jump Kick miss and cause recoil.
		battle.makeChoices('move highjumpkick', 'move agility');

		// Both Pokemon had a substitute, so the *target* Substitute takes recoil damage.
		let pokemon = battle.p1.active[0];
		assert.strictEqual(pokemon.maxhp - pokemon.hp, Math.floor(pokemon.maxhp / 4));
		assert.strictEqual(pokemon.volatiles['substitute'].hp, subhp);
		pokemon = battle.p2.active[0];
		assert.strictEqual(pokemon.maxhp - pokemon.hp, Math.floor(pokemon.maxhp / 4));
		assert.strictEqual(pokemon.volatiles['substitute'].hp, subhp - 1);

		// Hi Jump Kick hits and breaks the Substitite.
		battle.makeChoices('move highjumpkick', 'move agility');
		battle.resetRNG(); // Make Hi Jump Kick miss and cause recoil.
		battle.makeChoices('move highjumpkick', 'move agility');

		// Only P1 has a substitute, so no one takes recoil damage.
		pokemon = battle.p1.active[0];
		assert.strictEqual(pokemon.maxhp - pokemon.hp, Math.floor(pokemon.maxhp / 4));
		assert.strictEqual(pokemon.volatiles['substitute'].hp, subhp);
		pokemon = battle.p2.active[0];
		assert.strictEqual(pokemon.maxhp - pokemon.hp, Math.floor(pokemon.maxhp / 4));
	});

	it('should cause recoil damage from an opponent\'s moves to be based on damage dealt to the substitute', function () {
		battle = common.createBattle();
		battle.join('p1', 'Guest 1', 1, [{species: 'Mewtwo', ability: 'pressure', moves: ['substitute']}]);
		battle.join('p2', 'Guest 2', 1, [{species: 'Mewtwo', ability: 'noguard', moves: ['nastyplot', 'lightofruin']}]);
		battle.makeChoices('move substitute', 'move nastyplot');
		battle.makeChoices('move substitute', 'move lightofruin');
		let pokemon = battle.p2.active[0];
		assert.strictEqual(pokemon.maxhp - pokemon.hp, Math.ceil(Math.floor(battle.p1.active[0].maxhp / 4) / 2));
	});

	it('should cause recovery from an opponent\'s draining moves to be based on damage dealt to the substitute', function () {
		battle = common.createBattle();
		battle.join('p1', 'Guest 1', 1, [{species: 'Zangoose', ability: 'pressure', moves: ['substitute']}]);
		battle.join('p2', 'Guest 2', 1, [{species: 'Zangoose', ability: 'noguard', moves: ['bellydrum', 'drainpunch']}]);
		battle.makeChoices('move substitute', 'move bellydrum');
		let hp = battle.p2.active[0].hp;
		battle.makeChoices('move substitute', 'move drainpunch');
		assert.strictEqual(battle.p2.active[0].hp - hp, Math.ceil(Math.floor(battle.p1.active[0].maxhp / 4) / 2));
	});

	it('should block most status moves targetting the user', function () {
		battle = common.createBattle();
		battle.join('p1', 'Guest 1', 1, [{species: 'Mewtwo', ability: 'noguard', moves: ['substitute']}]);
		battle.join('p2', 'Guest 2', 1, [{species: 'Mewtwo', ability: 'pressure', item: 'laggingtail', moves: ['hypnosis', 'toxic', 'poisongas', 'thunderwave', 'willowisp']}]);
		for (let i = 1; i <= 5; i++) {
			battle.makeChoices('move substitute', 'move ' + i);
			assert.strictEqual(battle.p1.active[0].status, '');
		}
	});

	it('should allow multi-hit moves to continue after the substitute fades', function () {
		battle = common.createBattle();
		battle.join('p1', 'Guest 1', 1, [{species: 'Dragonite', ability: 'noguard', item: 'focussash', moves: ['substitute', 'roost']}]);
		battle.join('p2', 'Guest 2', 1, [{species: 'Dragonite', ability: 'hugepower', item: 'laggingtail', moves: ['roost', 'dualchop']}]);
		battle.makeChoices('move substitute', 'move roost');
		battle.makeChoices('move roost', 'move dualchop');
		assert.notStrictEqual(battle.p1.active[0].hp, battle.p1.active[0].maxhp);
	});

	it('should track what the actual damage would have been without the substitute in Gen 1', function () {
		battle = common.gen(1).createBattle([
			[{species: 'Ponyta', moves: ['substitute', 'growl'], evs: {hp: 252, spd: 252}}],
			[{species: 'Cloyster', moves: ['clamp'], evs: {spa: 252}}],
		]);

		const pokemon = battle.p1.active[0];
		battle.makeChoices('move substitute', 'move clamp');
		assert.strictEqual(pokemon.maxhp - pokemon.hp, Math.floor(pokemon.maxhp / 4));

		const hp = pokemon.hp;
		battle.makeChoices('move growl', 'move clamp');
		assert.bounded(hp - pokemon.hp, [91, 108]);
	});
});
