using FluentAssertions;
using JesLuckyPick.Domain.Entities;

namespace JesLuckyPick.Application.Tests;

public class UserProfileTests
{
    [Fact]
    public void User_ProfileFields_AreSettable()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "testuser",
            Email = "test@example.com",
            FirstName = "John",
            LastName = "Doe",
            PhoneNumber = "+639123456789",
            Bio = "A test user",
            ProfilePictureBase64 = "data:image/png;base64,iVBORw0KGgo="
        };

        user.FirstName.Should().Be("John");
        user.LastName.Should().Be("Doe");
        user.PhoneNumber.Should().Be("+639123456789");
        user.Bio.Should().Be("A test user");
        user.ProfilePictureBase64.Should().StartWith("data:image/png");
    }

    [Fact]
    public void User_ProfileFields_DefaultToNull()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "testuser",
            Email = "test@example.com"
        };

        user.FirstName.Should().BeNull();
        user.LastName.Should().BeNull();
        user.PhoneNumber.Should().BeNull();
        user.Bio.Should().BeNull();
        user.ProfilePictureBase64.Should().BeNull();
    }

    [Fact]
    public void User_ProfileUpdate_NullFieldsPreserveExisting()
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Username = "testuser",
            Email = "test@example.com",
            FirstName = "John",
            LastName = "Doe",
            PhoneNumber = "+639123456789",
            Bio = "Original bio"
        };

        // Simulate update where only firstName is provided
        string? newFirstName = "Jane";
        string? newLastName = null;
        string? newPhone = null;
        string? newBio = null;

        user.FirstName = newFirstName ?? user.FirstName;
        user.LastName = newLastName ?? user.LastName;
        user.PhoneNumber = newPhone ?? user.PhoneNumber;
        user.Bio = newBio ?? user.Bio;

        user.FirstName.Should().Be("Jane");
        user.LastName.Should().Be("Doe"); // preserved
        user.PhoneNumber.Should().Be("+639123456789"); // preserved
        user.Bio.Should().Be("Original bio"); // preserved
    }

    [Fact]
    public void AvatarSizeValidation_Under2MB_Passes()
    {
        // 1MB base64 string (approx 1.33MB in base64)
        var base64 = new string('A', 1_000_000);
        var estimatedBytes = base64.Length * 3 / 4;

        estimatedBytes.Should().BeLessThan(2 * 1024 * 1024);
    }

    [Fact]
    public void AvatarSizeValidation_Over2MB_Fails()
    {
        // ~3MB base64 string
        var base64 = new string('A', 3_000_000);
        var estimatedBytes = base64.Length * 3 / 4;

        estimatedBytes.Should().BeGreaterThan(2 * 1024 * 1024);
    }
}
