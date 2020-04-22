/**
 * A helper class to aid us in writing bits to a NodeJS
 * @author ale8k
 */
export default class WriteBit {
    /**
     * Writes bits to a NodeJS Buffer
     * @param buffer the buffer
     * @param i buffer index
     * @param bit bit index
     * @param value bit value
     */
    public writeBit(b: Buffer | Uint8Array, index: number, bit: number, value: number): void {
        if (value === 0) {
            b[index] &= ~(1 << bit);
        } else {
            b[index] |= (1 << bit);
        }
    }
    /**
     * Converts a number in an array of bits with a specified fixed
     * size of bits. Please note, if you pass a number that has a minimum bits of
     * say 4, and try to fix it to size 1. This will not work.
     * @param num the number to convert into a bit arr
     * @param amount the amount of bits to emit
     * @author ale8k
     */
    public convertToFixedBitArray(num: number, amount: number): number[] {
        const bitArr = this.convertToBitArray(num);
        const bitArrLength = bitArr.length; // remembers the initial length

        if (bitArr.length < amount) {
            for (let i = 0; i < amount - bitArrLength; i++) {
                bitArr.unshift(0);
            }
        }

        return bitArr;
    }
    /**
     * Takes a whole integer values and parses it into an array of bits
     * @param number the integer
     * @author ale8k
     */
    private convertToBitArray(number: number): number[] {
        const numBitArr = (number)?.toString(2).split("").map(numString => {
            return parseInt(numString);
        });
        return numBitArr;
    }

}
