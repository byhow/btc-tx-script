# BTC Transaction Script

## Running the Application

The insertion and aggregation script will be written in TypeScript + Deno so that there's minimal amount of things I need to setup locally in order to parse and retrieve the transactions.

- Run `docker-compose up --build`
- The output should be at the end of the execution

## Keys

From just pure script:

```txt
Deposited for Wesley Crusher: count=35 sum=183
Deposited for Leonard McCoy: count=18 sum=97
Deposited for Jonathan Archer: count=19 sum=97.49
Deposited for Jadzia Dax: count=16 sum=77.47999999999999
Deposited for Montgomery Scott: count=27 sum=131.93252999999999
Deposited for James T. Kirk: count=22 sum=1210.60058269
Deposited for Spock: count=18 sum=877.6408871000001
Deposited without reference: count=23 sum=1151.88738228
Smallest valid deposit: 0
Largest valid deposit: 99.61064066
```

## Data

The data to work with in this scenario comes from bitcoind’s rpc call `listsinceblock`. A frequently used approach to detect incoming deposits is to periodically call `listsinceblock` and process the returned data. The mock dataset contains 2 json files that represent the data from 2 separate calls to this endpoint, and the script processes those files and detects all valid incoming deposits.
