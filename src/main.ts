import chalk from 'chalk';
import PriceFinder from 'price-finder';

interface Item {
  name: string;
  previousPrice: number;
  url: string;
}

const items: Item[] = [];

const priceFinder = new PriceFinder();
const log = console.log;

function getRandomArbitrary(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function getSleepTime() {
  return Math.floor(getRandomArbitrary(3, 9)) * 1000;
}

async function sleep(duration: number) {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

async function printPrice({ name, previousPrice, url }: Item) {
  const price = await priceFinder.findItemPrice(url);
  log(`${chalk.cyanBright(name)} @ ${chalk.yellowBright(price)}`);
  if (previousPrice && price !== undefined) {
    if (previousPrice > price) {
      log(chalk.greenBright(`price dropped! previousPrice: ${previousPrice}`));
    } else if (previousPrice === price) {
      log(chalk.gray('same price'));
    } else {
      log(chalk.redBright(`price increase! previousPrice: ${previousPrice}`));
    }
  }
  const sleepTime = getSleepTime();
  log(chalk.gray(`sleeping for ${sleepTime}...`));
  await sleep(sleepTime);
  log(chalk.gray('...done sleeping'));
}

async function main() {
  log('');
  log('');
  for (const item of items) {
    await printPrice(item);
  }
  log('');
  log(chalk.white('done'));
}

main();
