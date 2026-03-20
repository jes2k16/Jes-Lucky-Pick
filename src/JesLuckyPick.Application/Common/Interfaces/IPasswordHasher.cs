namespace JesLuckyPick.Application.Common.Interfaces;

public interface IPasswordHasher
{
    (string Hash, byte[] Salt) HashPassword(string password);
    bool VerifyPassword(string password, string hash, byte[] salt);
}
