using FluentAssertions;
using JesLuckyPick.Domain.Entities;

namespace JesLuckyPick.Application.Tests;

public class DrawEntityTests
{
    [Fact]
    public void GetNumbers_ReturnsAllSixNumbers()
    {
        var draw = new Draw
        {
            Number1 = 5,
            Number2 = 12,
            Number3 = 23,
            Number4 = 31,
            Number5 = 38,
            Number6 = 42
        };

        var numbers = draw.GetNumbers();

        numbers.Should().HaveCount(6);
        numbers.Should().BeEquivalentTo(new short[] { 5, 12, 23, 31, 38, 42 });
    }

    [Fact]
    public void GetNumbers_PreservesOrder()
    {
        var draw = new Draw
        {
            Number1 = 1,
            Number2 = 10,
            Number3 = 20,
            Number4 = 30,
            Number5 = 40,
            Number6 = 42
        };

        var numbers = draw.GetNumbers();

        numbers.Should().ContainInOrder(1, 10, 20, 30, 40, 42);
    }
}
