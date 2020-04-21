/**
 * A static helper class which reads all forms of shorts,
 * including Jagex's special categories
 * @author ale8k
 */
export default class ReadShort {
    /**
     * Reads a Big-endian short at specified index
     */
    public static BE(b: Buffer, index: number): number {
        let value = ((b[index] & 0xff) << 8) + (b[index + 1] & 0xff);
        if (value > 32767) {
            value -= 0x10000;
        }
        return value;
    }
    /**
     * Reads a Little-endian short at specified index
     */
    public static LE(b: Buffer, index: number): number {
        let value = ((b[index + 1] & 0xff) << 8) + (b[index] & 0xff);
        if (value > 32767) {
            value -= 0x10000;
        }
        return value;
    }
    /**
     * Reads a Little-endian short with the 'A' suffix at specified index
     */
    public static LEA(b: Buffer, index: number): number {
        let value = ((b[index + 1] & 0xff) << 8) + (b[index] - 128 & 0xff);
        if (value > 32767) {
            value -= 0x10000;
        }
        return value;
    }
    /**
     * Reads an unsigned Big-endian short at specified index
     */
    public static UBE(b: Buffer, index: number): number {
        return ((b[index] & 0xff) << 8) + (b[index + 1] & 0xff);
    }
    /**
     * Reads an unsigned Big-endian short with the 'A' suffix at specified index
     */
    public static UBEA(b: Buffer, index: number): number {
        return ((b[index] & 0xff) << 8) + (b[index + 1] - 128 & 0xff);
    }
}
