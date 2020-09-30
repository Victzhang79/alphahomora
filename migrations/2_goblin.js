const Gringotts = artifacts.require('Gringotts');
const SimpleGringottsConfig = artifacts.require('SimpleGringottsConfig');
const WETH = artifacts.require('WETH')
const UniswapV2Factory = artifacts.require('UniswapV2Factory')
const UniswapV2Router02 = artifacts.require('UniswapV2Router02');
const UniswapV2Pair = artifacts.require('UniswapV2Pair');
const MockERC20 = artifacts.require('MockERC20');
const StrategyAllETHOnly = artifacts.require('StrategyAllETHOnly');
const StrategyLiquidate = artifacts.require('StrategyLiquidate');
const StakingRewards = artifacts.require('StakingRewards');
const UniswapGoblin = artifacts.require('UniswapGoblin');

module.exports = function (deployer, network, [creator]) {
  if (network !== "kovan") return;

  deployer.then(async() => {
    const router = await UniswapV2Router02.at("0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D");
    const factory = await UniswapV2Factory.at(await router.factory());
    const weth = await WETH.at(await router.WETH());

    await deployer.deploy(MockERC20, 'MOCK', 'MOCK');
    const token = await MockERC20.deployed();

    await deployer.deploy(MockERC20, 'UNISWAP', 'UNI');
    const uni = await MockERC20.deployed();

    await factory.createPair(weth.address, token.address);
    const pair = await factory.getPair(token.address, weth.address);
    const lp = await UniswapV2Pair.at(pair);

    await deployer.deploy(StrategyAllETHOnly, router.address);
    const addStrat = await StrategyAllETHOnly.deployed();

    await deployer.deploy(StrategyLiquidate, router.address);
    const liqStrat = await StrategyLiquidate.deployed();
    
    await deployer.deploy(SimpleGringottsConfig, 
      web3.utils.toWei('1', 'ether'),
      '3472222222222', // 30% per year
      '1000', // 10% reserve pool
      '1000' // 10% Kedavra prize
    );
    const config = await SimpleGringottsConfig.deployed();

    await deployer.deploy(Gringotts, config.address);
    const bank = await Gringotts.deployed();
    
    await deployer.deploy(StakingRewards,
      creator,
      creator,
      uni.address,
      lp.address
    );
    const staking = await StakingRewards.deployed();

    await deployer.deploy(UniswapGoblin,
      bank.address,
      staking.address,
      router.address,
      token.address,
      uni.address,
      addStrat.address,
      liqStrat.address,
      '100'
    );

    const goblin = await UniswapGoblin.deployed();

    // setup goblin to config
    await config.setIsGoblin(goblin.address, true);
    await config.setAcceptDebt(goblin.address, true);
    await config.setWorkFactor(goblin.address, '7000');
    await config.setKillFactor(goblin.address, '8000');

    // mint mock token to deployer
    await token.mint(creator, web3.utils.toWei('100', 'ether'));
    await uni.mint(creator, web3.utils.toWei('100', 'ether'));
  });
};