using System.Security.Cryptography;
using JesLuckyPick.Application.Common.Interfaces;
using Konscious.Security.Cryptography;

namespace JesLuckyPick.Infrastructure.Identity;

public class Argon2PasswordHasher : IPasswordHasher
{
    private const int SaltSize = 16;
    private const int HashSize = 32;
    private const int DegreeOfParallelism = 4;
    private const int MemorySize = 65536; // 64 MB
    private const int Iterations = 3;

    public (string Hash, byte[] Salt) HashPassword(string password)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSize);
        var hash = ComputeHash(password, salt);
        return (Convert.ToBase64String(hash), salt);
    }

    public bool VerifyPassword(string password, string hash, byte[] salt)
    {
        var computedHash = ComputeHash(password, salt);
        var storedHash = Convert.FromBase64String(hash);
        return CryptographicOperations.FixedTimeEquals(computedHash, storedHash);
    }

    private static byte[] ComputeHash(string password, byte[] salt)
    {
        using var argon2 = new Argon2id(System.Text.Encoding.UTF8.GetBytes(password))
        {
            Salt = salt,
            DegreeOfParallelism = DegreeOfParallelism,
            MemorySize = MemorySize,
            Iterations = Iterations
        };
        return argon2.GetBytes(HashSize);
    }
}
