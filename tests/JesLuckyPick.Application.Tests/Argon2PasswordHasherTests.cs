using FluentAssertions;
using JesLuckyPick.Infrastructure.Identity;

namespace JesLuckyPick.Application.Tests;

public class Argon2PasswordHasherTests
{
    private readonly Argon2PasswordHasher _hasher = new();

    [Fact]
    public void HashPassword_ReturnsNonEmptyHashAndSalt()
    {
        var (hash, salt) = _hasher.HashPassword("TestPassword123!");

        hash.Should().NotBeNullOrWhiteSpace();
        salt.Should().NotBeEmpty();
    }

    [Fact]
    public void HashPassword_DifferentSaltsForSamePassword()
    {
        var (hash1, salt1) = _hasher.HashPassword("TestPassword123!");
        var (hash2, salt2) = _hasher.HashPassword("TestPassword123!");

        salt1.Should().NotEqual(salt2);
        hash1.Should().NotBe(hash2);
    }

    [Fact]
    public void VerifyPassword_CorrectPassword_ReturnsTrue()
    {
        const string password = "MySecurePass!";
        var (hash, salt) = _hasher.HashPassword(password);

        var result = _hasher.VerifyPassword(password, hash, salt);

        result.Should().BeTrue();
    }

    [Fact]
    public void VerifyPassword_WrongPassword_ReturnsFalse()
    {
        var (hash, salt) = _hasher.HashPassword("CorrectPassword");

        var result = _hasher.VerifyPassword("WrongPassword", hash, salt);

        result.Should().BeFalse();
    }

    [Fact]
    public void VerifyPassword_EmptyPassword_ThrowsArgumentException()
    {
        var (hash, salt) = _hasher.HashPassword("SomePassword");

        var act = () => _hasher.VerifyPassword("", hash, salt);

        act.Should().Throw<ArgumentException>();
    }
}
